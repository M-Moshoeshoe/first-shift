import { PageShell } from "@/components/ui/PageShell";
import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";
import { BandRow } from "./_components/BandRow";
import { HeroBand } from "./_components/HeroBand";
import { HowItWorksBand } from "./_components/HowItWorksBand";
import { Pitch } from "./_components/Pitch";
import { StartBand } from "./_components/StartBand";

// Tones alternate from the top at every width. Phone: hero paper, slip mist, how it works paper,
// the three pitches mist, paper, mist, start paper. Desktop: hero paper, how it works mist, pitches paper, start mist.
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
      <HowItWorksBand />
      <BandRow lgTone="paper" columns={3} align="start" cells={pitches.map((pitch) => ({ key: pitch.id, tone: pitch.tone, content: <Pitch {...pitch} /> }))} />
      <StartBand />
    </PageShell>
  );
}
