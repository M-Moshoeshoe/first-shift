import { Band } from "@/components/ui/Band";

interface PitchBandProps {
  id: string;
  tone: "paper" | "mist";
  heading: string;
  text: string;
}

/** A heading and one sentence, for one audience or promise. */
export function PitchBand({ id, tone, heading, text }: PitchBandProps) {
  return (
    <Band tone={tone}>
      <section aria-labelledby={id} className="reveal flex flex-col gap-2">
        <h2 id={id} className="text-xl font-bold">
          {heading}
        </h2>
        <p className="text-lg">{text}</p>
      </section>
    </Band>
  );
}
