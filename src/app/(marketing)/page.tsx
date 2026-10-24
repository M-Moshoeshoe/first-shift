import { PageShell } from "@/components/ui/PageShell";
import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";
import { ExampleTryoutBand } from "./_components/ExampleTryoutBand";
import { HeroBand } from "./_components/HeroBand";
import { HowItWorksBand } from "./_components/HowItWorksBand";
import { PitchBand } from "./_components/PitchBand";
import { StartBand } from "./_components/StartBand";

// Bands alternate paper and mist from the top: hero, slip, how it works, then these three.
const pitches = [
  {
    id: "for-young-people",
    tone: "mist",
    heading: "For young people",
    text: `Get paid the same day, at least ${formatRand(RULES.minimumWageCentsPerHour)} an hour, and leave with a reference from the business that paid.`,
  },
  {
    id: "for-businesses",
    tone: "paper",
    heading: "For businesses",
    text: "Post a tryout in one sentence, see who's likely to show up, and pay by eWallet, bank transfer or cash.",
  },
  {
    id: "safe-for-both-sides",
    tone: "mist",
    heading: "Safe for both sides",
    text: "Tryouts happen in daylight at business premises. IDs are checked at the door, and trips can be shared with someone you trust.",
  },
] as const;

export default function HomePage() {
  return (
    <PageShell>
      <HeroBand />
      <ExampleTryoutBand />
      <HowItWorksBand />
      {pitches.map((pitch) => (
        <PitchBand key={pitch.id} {...pitch} />
      ))}
      <StartBand />
    </PageShell>
  );
}
