import { RULES } from "@/config/rules";

/** After three tryouts with the same person, prompt the owner to offer a job. */
export function shouldPromptHire(completedWithSamePerson: number, alreadyOffered: boolean): boolean {
  return !alreadyOffered && completedWithSamePerson >= RULES.hirePromptAfterTryouts;
}
