"use client";

import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { TextField } from "@/components/ui/TextField";
import { RULES } from "@/config/rules";
import { ABOUT_COPY, languageOptions, skillOptions } from "@/domain/profileCopy";
import { LANGUAGES, SKILLS, type Language, type Skill } from "@/domain/workerProfile";
import { fieldErrors, firstInvalid, shakeAndFocus } from "@/lib/forms";
import { WorkerAboutSchema } from "@/schemas/profile";

export interface AboutDraft {
  skills: Skill[];
  languages: Language[];
  intro: string;
}

const FIELDS = ["skills", "languages", "intro"] as const;
export type AboutField = (typeof FIELDS)[number];
export const aboutFieldId = (field: AboutField) => `work-${field}`;
const SKILL_OPTIONS = skillOptions(SKILLS);
const LANGUAGE_OPTIONS = languageOptions(LANGUAGES);

/** The fields of "What you can do", shared by onboarding and Profile. Checked by the caller with WorkerAboutSchema. */
export function AboutFields({ draft, errors, update, idOf = aboutFieldId }: { draft: AboutDraft; errors: Partial<Record<AboutField, string>>; update: <K extends AboutField>(field: K, value: AboutDraft[K]) => void; idOf?: (field: AboutField) => string }) {
  return (
    <>
      <CheckboxGroup id={idOf("skills")} legend={ABOUT_COPY.skills} hint={ABOUT_COPY.skillsHint} options={SKILL_OPTIONS} values={draft.skills} error={errors.skills} onChange={(values) => update("skills", values)} />
      <CheckboxGroup id={idOf("languages")} legend={ABOUT_COPY.languages} hint={ABOUT_COPY.languagesHint} options={LANGUAGE_OPTIONS} values={draft.languages} error={errors.languages} onChange={(values) => update("languages", values)} />
      <TextField id={idOf("intro")} label={ABOUT_COPY.intro} hint={ABOUT_COPY.introHint} maxLength={RULES.introMaxChars} value={draft.intro} error={errors.intro} onChange={(event) => update("intro", event.target.value)} />
    </>
  );
}

/** Checks "What you can do" with the server's schema: one message per field, the first one shaken and focused. */
export function checkAbout(draft: AboutDraft, idOf: (field: AboutField) => string = aboutFieldId): Partial<Record<AboutField, string>> | null {
  const parsed = WorkerAboutSchema.safeParse(draft);
  if (parsed.success) return null;
  const errors = fieldErrors(parsed.error, FIELDS);
  const first = firstInvalid(errors, FIELDS);
  if (first) requestAnimationFrame(() => shakeAndFocus(idOf(first)));
  return errors;
}
