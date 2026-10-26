import type { Metadata } from "next";
import { Banknote, CalendarX, ClipboardCheck, Clock, Flag, HeartPulse, IdCard, MapPin, Phone, Scale, ShieldAlert, Siren, X } from "lucide-react";
import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";
import { SCENES } from "../_components/scenes";
import { PlainPage, type PlainSection } from "../_components/PlainPage";

export const metadata: Metadata = { title: "Safety and fair play on First Shift", description: "How First Shift keeps young people and businesses safe, and what happens when something goes wrong." };

const MINIMUM = formatRand(RULES.minimumWageCentsPerHour);

// Emergency numbers checked on 26 October 2026: 10111, 10177 and 112 on the Western Cape Government's emergency page,
// and the GBV Command Centre (Department of Social Development) in SAnews, September 2026 (docs/PHASES.md, From the panel's feedback).
const SECTIONS: readonly PlainSection[] = [
  {
    heading: "In an emergency",
    icon: Siren,
    body: [{ icon: Phone, points: ["Police: 10111", "From a cellphone: 112. It works even without airtime.", "Ambulance: 10177", "Gender-based violence: the GBV Command Centre on 0800 428 428, free, day and night"] }, "Get safe first. Then tap Report a problem on the booking, so the First Shift team knows."],
  },
  {
    heading: "Who we check",
    icon: IdCard,
    body: [
      "What we check today:",
      [
        "Every South African ID number: its date of birth, its check digit and that the person is 18 or older",
        "One ID number, one account, so nobody can start again to escape strikes",
        "Business owners give their full name, ID number, a face photo taken live and a contact number",
        "At the door, the owner checks the young person's face against their photo, and the name and last four digits on their ID card, then types the 6-digit code the young person shows",
      ],
      "What we do not check yet:",
      { icon: X, points: ["A licensed identity check against Home Affairs", "Refugee IDs, permits and visas: these cannot be used yet", "Whether a business is registered with the Compensation Fund (COIDA)", "Faces: we do not run face matching"] },
    ],
  },
  {
    heading: "Every tryout",
    icon: ClipboardCheck,
    body: [
      [
        `Paid at least ${MINIMUM} an hour, the national minimum wage, with at least ${RULES.minPaidHours} hours paid`,
        "In daylight only, between 07:00 and 18:00",
        "At the business itself, never at someone's home",
        "With the owner on site",
        "Posted at least 2 hours before it starts, so you have time to get there",
      ],
      "Work that is unsafe for a first day is refused before it is posted: electrical, gas and plumbing work, work that needs a qualified tradesperson, driving or machinery, ladders and roofs, handling cash alone, security work, looking after children or sick people, hazardous chemicals, work in someone's home, and work at night or alone.",
    ],
  },
  {
    heading: "Share your trip",
    icon: MapPin,
    body: ["Once you are booked, Share my trip sends a trusted person a link. It shows your first name, the business, the times and how the day is going, and nothing else. It stops working at midnight after the tryout."],
  },
  {
    heading: "Report a problem",
    icon: Flag,
    body: [
      "Every booking has Report a problem, before, during and after the day, for both sides. A young person can report harassment, unsafe work, being asked for money, not being paid, or something else.",
      "Harassment, unsafe work and being asked for money pause the business at once, before anyone looks into it. Someone from the First Shift team looks into every report and contacts you.",
    ],
  },
  {
    heading: "If you are not paid",
    icon: Banknote,
    body: [
      "The business pays you directly at the end of the day, by one of the ways you chose: FNB eWallet, PayShap, a cash-send from their bank, or cash. First Shift does not move money.",
      "Before you tap Received, check that the money is really there:",
      ["FNB eWallet: dial *120*277# for your balance", "PayShap: check your banking app", "Cash-send: it is real only once an ATM or till pays it out", "Cash: count it in front of the owner"],
      "If it is not there, tap Not received. The business is paused at once, and each side can add one screenshot as proof. A business that has not marked a tryout paid by 23:59 that day is paused until it pays.",
    ],
  },
  {
    heading: "Scam rules",
    icon: ShieldAlert,
    body: [
      [
        "You never pay anyone to get a tryout: no fee, no deposit, no uniform to buy. A tryout that asks for money is refused before it is posted.",
        "First Shift never asks you to send money back. If a business pays too much, you do not have to send anything back. If anyone asks you to, do not pay, and report it.",
        "A cash-send SMS is not money yet. It is real only once an ATM or till pays it out.",
        "Check your real balance instead of trusting an SMS or a screenshot.",
      ],
    ],
  },
  {
    heading: "Cancellations",
    icon: CalendarX,
    body: [
      "Cancelling is free until 12 hours before the start, or 15 minutes after booking, whichever is later. After that it is late, and a late cancellation is a strike for whoever cancelled.",
      `A business that cancels late still owes the young person ${RULES.minPaidHours} hours' pay. A business that does not open owes the same.`,
      "If nobody checks in, the owner can record a no-show 30 minutes after the start, and the young person can say the business was not open. The First Shift team looks into both.",
    ],
  },
  {
    heading: "Disputes and strikes",
    icon: Scale,
    body: [
      "Every report, every Not received, every no-show and every challenged reference is looked into by a person on the First Shift team, safety first, with what both sides said.",
      "A strike is a no-show, a late cancellation, a false payment claim, or a safety report that is upheld. Strikes stop counting after 90 days, and any strike can be overturned when it is looked into.",
    ],
  },
  {
    heading: "Injuries and COIDA",
    icon: HeartPulse,
    body: [
      "On the tryout day, the business is your employer. The Compensation for Occupational Injuries and Diseases Act covers casual workers from the first hour, through the business's registration with the Compensation Fund.",
      "Every tryout shows Injury cover: confirmed by the business, or Injury cover: not confirmed. We do not check this with the Fund yet. If you are hurt, get help first, tell the owner, then report it on the booking.",
    ],
  },
  {
    heading: "The 24-hour line",
    icon: Clock,
    body: ["Tryouts are not regular work. Once a young person has worked close to 24 hours in a month with the same business, another tryout is refused: from 24 hours, the law treats it as regular employment, with UIF and leave. The business can offer a job instead."],
  },
];

/** Safety and fair play: plain text, public, linked from every public page's footer. */
export default function SafetyPage() {
  return <PlainPage photo={SCENES.corner} title="Safety and fair play" intro="How First Shift keeps tryouts safe and fair for both sides, and what happens when something goes wrong." sections={SECTIONS} />;
}
