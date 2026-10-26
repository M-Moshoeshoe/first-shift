import { CV_COPY, RECORD_COPY } from "./recordCopy";

/** One verified tryout as the CV text needs it: the record's own entry, with the year a CV reader expects. */
export interface CvEntry {
  businessName: string;
  businessArea: string;
  /** As the record shows it: "Saturday 24 October". */
  day: string;
  /** Optional only for a reply from the previous deploy; every new record carries it. */
  year?: number;
  hours: number;
  /** The approved reference only; a draft or challenged one never reaches a CV. */
  reference: { text: string } | null;
}

/** The first sentence of an approved reference, for its one line on a CV. */
export function referenceSummary(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const end = clean.search(/[.!?](\s|$)/);
  return end === -1 ? clean : clean.slice(0, end + 1);
}

/**
 * "Copy for my CV": the work record as plain text to paste into a CV or a job
 * application. One block per tryout in the order given (the record's, newest
 * first), the reference's first sentence when there is an approved one,
 * "Hired by" once on the newest block for that business, and the share link
 * so an employer can check every line.
 */
export function cvText(entries: readonly CvEntry[], jobs: readonly { businessName: string; hired: boolean }[], link: string): string {
  const hiredBy = new Set(jobs.filter((job) => job.hired).map((job) => job.businessName));
  const named = new Set<string>();
  const blocks = entries.map((entry) => {
    const lines = [CV_COPY.line(entry.businessName, entry.businessArea, entry.year ? `${entry.day} ${entry.year}` : entry.day, RECORD_COPY.hours(entry.hours))];
    if (entry.reference) lines.push(referenceSummary(entry.reference.text));
    if (hiredBy.has(entry.businessName) && !named.has(entry.businessName)) {
      lines.push(CV_COPY.hiredBy(entry.businessName));
      named.add(entry.businessName);
    }
    return lines.join("\n");
  });
  return [CV_COPY.heading, ...blocks, CV_COPY.checkAt(link)].join("\n\n");
}
