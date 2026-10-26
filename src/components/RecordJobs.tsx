import { HIRE_COPY } from "@/domain/recordCopy";

/** The job offers on a work record, own or shared: "Offered a job by", or "Hired by" once the owner marked it (domain/hire.ts). */
export function RecordJobs({ jobs }: { jobs: readonly { businessName: string; hired: boolean }[] }) {
  if (jobs.length === 0) return null;
  return (
    <ul aria-label="Job offers" className="flex flex-col gap-2">
      {jobs.map((job) => (
        <li key={job.businessName} className="border border-line p-4 text-base font-semibold">
          {job.hired ? HIRE_COPY.hiredBy(job.businessName) : HIRE_COPY.offeredBy(job.businessName)}
        </li>
      ))}
    </ul>
  );
}
