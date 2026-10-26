import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AI_EFFORT, AI_MODEL } from "@/config/ai";
import { askForJson } from "@/server/claude";
import { AppError } from "@/server/errors";

// Never the network: the SDK client is replaced and each test sets what it "returned".
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { parse }; } }));

const Schema = z.object({ category: z.string() });
const request = { purpose: "classify", system: "sort it", user: "<owner_text>x</owner_text>", maxTokens: 1024, schema: Schema };

beforeAll(() => vi.stubEnv("ANTHROPIC_API_KEY", "test-key"));
afterEach(() => {
  parse.mockReset();
  vi.restoreAllMocks();
});

const answer = (stop_reason: string, parsed_output: unknown) => ({ stop_reason, parsed_output, content: [] });

describe("askForJson", () => {
  it("asks for the schema's shape at the configured model and effort, and returns the parsed answer", async () => {
    parse.mockResolvedValue(answer("end_turn", { category: "cleaning" }));
    await expect(askForJson(request)).resolves.toEqual({ category: "cleaning" });
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: AI_MODEL,
        max_tokens: 1024,
        system: "sort it",
        messages: [{ role: "user", content: "<owner_text>x</owner_text>" }],
        output_config: expect.objectContaining({ effort: AI_EFFORT, format: expect.objectContaining({ type: "json_schema" }) }),
      }),
    );
  });

  it.each([
    ["a refusal", answer("refusal", null), "stopped_refusal"],
    ["an answer cut off by max_tokens", answer("max_tokens", null), "stopped_max_tokens"],
    ["output that didn't match the schema", answer("end_turn", null), "schema_mismatch"],
  ])("fails closed on %s, and logs why without the request text", async (_name, response, reason) => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    parse.mockResolvedValue(response);
    await expect(askForJson(request)).rejects.toMatchObject({ status: 502, code: "ai_unavailable" });
    const line = String(logged.mock.calls[0]?.[0]);
    expect(line).toContain(reason);
    expect(line).not.toContain("owner_text");
  });

  it("fails closed when the API call itself throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    parse.mockRejectedValue(new Error("timeout"));
    const error = await askForJson(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 502, publicMessage: "We could not draft that right now. Try again in a minute." });
  });
});
