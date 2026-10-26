import "server-only";
import { SEEDED_ANSWERS } from "@/data/demoHistory";
import { writeReference } from "./ai";
import { log } from "./log";

const SEEDED_TASKS = ["Greet customers and write repairs in the book", "Clean and pack phone cases on the shelves"];

/**
 * The seeded demo reference, written by the live model from the same three
 * answers and tasks a real one is written from, so "Written with AI" on it is
 * true. If the model can't be reached, null: the reset then stores the
 * hand-written example, labelled "Example reference for the demo".
 */
export async function seededReferenceText(): Promise<string | null> {
  try {
    return await writeReference(SEEDED_ANSWERS, SEEDED_TASKS);
  } catch (error) {
    log("warn", "demo_reference_unavailable", { reason: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}
