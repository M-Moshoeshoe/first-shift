import { AiClipboard } from "@/components/AiMark";

/**
 * While the model works: the AI mark, one honest line and an indeterminate
 * bar. Drafting and the safety check run together on the server and answer
 * once, so there are no steps or percentages to show; any would be made up.
 * The bar moves with the skeleton shimmer, already in the motion list.
 */
export function AiGuide() {
  return (
    <div role="status" className="flex flex-col gap-3 border border-line p-3">
      <div className="flex items-center gap-3">
        <AiClipboard size={28} />
        <p className="text-sm">Checking it is safe work and drafting your options. This takes a few seconds.</p>
      </div>
      <div role="progressbar" aria-label="Checking and drafting" className="h-1 skeleton" />
    </div>
  );
}
