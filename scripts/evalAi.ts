import { AI_EFFORT, AI_MODEL } from "../src/config/ai";
import { checkText } from "../src/domain/tryout";
import { checkWork, draftTryout } from "../src/server/ai";
import { AI_CASES, type AiCase } from "../tests/fixtures/aiCases";

/**
 * Runs every case in tests/fixtures/aiCases.ts against the real Claude API
 * and prints a pass or fail table. Each allowed case is checked twice: the
 * request, then its own draft as the owner would post it unedited. Exits
 * non-zero on any failure. Never run in CI: it needs a real key and costs
 * money (a few cents on Claude Haiku 5.5).
 *
 *   npm run eval:ai   (reads ANTHROPIC_API_KEY from .env.local)
 */
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Refusing to run: set ANTHROPIC_API_KEY in .env.local. This eval calls the real API.");
  process.exit(1);
}

const CONCURRENCY = 4;
const MONEY = /\bR\s?\d|\bpay\b|\brand\b|\bwage/i;

interface Row {
  case: string;
  kind: AiCase["kind"];
  expected: string;
  got: string;
  draft: string;
  result: "pass" | "FAIL";
}

const describe = (aiCase: AiCase): string =>
  aiCase.expect.outcome === "blocked" ? `blocked (${aiCase.expect.category})` : aiCase.expect.outcome;

/** Both calls the draft route makes, on the same text the route checks. */
async function runCase(aiCase: AiCase): Promise<Row> {
  const text = checkText("", [], aiCase.text);
  const [decision, draft] = await Promise.allSettled([checkWork(text), draftTryout(aiCase.text)]);
  const base = { case: aiCase.id, kind: aiCase.kind, expected: describe(aiCase) };

  if (decision.status === "rejected") return { ...base, got: "error (failed closed)", draft: "-", result: "FAIL" };
  const work = decision.value;
  const got = work.decision === "review" ? "review" : `${work.decision} (${work.category})`;

  const options = draft.status === "fulfilled" ? draft.value.options : [];
  const draftText = draft.status === "fulfilled" ? options.flatMap((option) => [option.title, ...option.tasks]).join(" ") : null;
  const draftNote = draftText === null ? "error" : MONEY.test(draftText) ? "mentions money" : `${options.length} options`;

  // An allowed request's own draft must pass the check again at publish, as the owner would post it unedited.
  // Every option the owner could choose must pass, so the first one that doesn't is the one reported.
  const checks = aiCase.expect.outcome === "allowed" ? await Promise.all(options.map((option) => checkWork(checkText(option.title, option.tasks, aiCase.text)))) : [];
  const published = checks.find((check) => check.decision !== "allowed") ?? checks[0] ?? null;
  const publishNote = published && published.decision !== "allowed" ? `, at publish: ${published.decision === "blocked" ? `blocked (${published.category})` : "review"}` : "";

  const outcomeOk =
    aiCase.expect.outcome === "allowed" ? work.decision === "allowed" : aiCase.expect.outcome === "blocked" ? work.decision === "blocked" : work.decision !== "allowed";
  // An allowed request must also draft cleanly; no draft may ever talk about money (pay is set by the owner, checked by code).
  const draftOk = draftText === null ? aiCase.expect.outcome !== "allowed" : !MONEY.test(draftText);
  const publishOk = published === null || published.decision === "allowed";
  return { ...base, got: got + publishNote, draft: draftNote, result: outcomeOk && draftOk && publishOk ? "pass" : "FAIL" };
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (let start = 0; start < AI_CASES.length; start += CONCURRENCY) {
    rows.push(...(await Promise.all(AI_CASES.slice(start, start + CONCURRENCY).map(runCase))));
  }
  console.log(`AI eval, ${new Date().toISOString().slice(0, 10)}, ${AI_MODEL} at effort ${AI_EFFORT}`);
  console.table(rows);

  const failed = rows.filter((row) => row.result === "FAIL");
  const count = (kind: AiCase["kind"]) => `${rows.filter((row) => row.kind === kind && row.result === "pass").length}/${rows.filter((row) => row.kind === kind).length}`;
  console.log(`allowed ${count("allowed")}, blocked refused ${count("blocked")}, hostile resisted ${count("hostile")}`);
  if (failed.length > 0) {
    console.error(`${failed.length} of ${rows.length} cases failed: ${failed.map((row) => row.case).join(", ")}`);
    process.exit(1);
  }
  console.log(`All ${rows.length} cases passed.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
