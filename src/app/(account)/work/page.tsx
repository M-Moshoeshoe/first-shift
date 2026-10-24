import Link from "next/link";

// Placeholder until Phase 3 builds this screen (see docs/PHASES.md).
export default function Page() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-5 py-10">
      <h1 className="text-3xl font-bold">Find a paid tryout</h1>
      <p className="text-muted">This screen is built in Phase 3.</p>
      <Link href="/" className="font-bold underline">
        Back to the start
      </Link>
    </main>
  );
}
