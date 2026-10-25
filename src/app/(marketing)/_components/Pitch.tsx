interface PitchProps {
  id: string;
  heading: string;
  text: string;
}

/** A heading and one sentence, for one audience or promise. */
export function Pitch({ id, heading, text }: PitchProps) {
  return (
    <section aria-labelledby={id} className="reveal flex flex-col gap-2">
      <h2 id={id} className="text-xl font-bold">
        {heading}
      </h2>
      <p className="text-lg">{text}</p>
    </section>
  );
}
