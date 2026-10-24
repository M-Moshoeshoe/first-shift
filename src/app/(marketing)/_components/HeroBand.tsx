import { Band } from "@/components/ui/Band";
import { PageTitle } from "@/components/ui/PageTitle";

export function HeroBand() {
  return (
    <Band tone="paper">
      <div className="reveal">
        <PageTitle title="Every job wants experience. This is where you get it." intro="Paid one-day tryouts at businesses near you, with a reference from the business that paid." />
      </div>
    </Band>
  );
}
