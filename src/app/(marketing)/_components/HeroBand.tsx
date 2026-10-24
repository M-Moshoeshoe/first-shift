import { Band } from "@/components/ui/Band";

export function HeroBand() {
  return (
    <Band tone="paper">
      <div className="reveal flex flex-col gap-4">
        <h1 className="text-4xl font-bold leading-tight tracking-title">Every job wants experience. This is where you get it.</h1>
        <p className="text-lg text-muted">Paid one-day tryouts at businesses near you, with a reference from the business that paid.</p>
      </div>
    </Band>
  );
}
