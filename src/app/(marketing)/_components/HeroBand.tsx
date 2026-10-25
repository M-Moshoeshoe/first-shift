import { PageTitle } from "@/components/ui/PageTitle";
import { BandRow } from "./BandRow";
import { ExampleTryout } from "./ExampleTryout";

/** The hero: on a phone, the promise then the example slip in its own band; on a desktop, copy left and slip right. */
export function HeroBand() {
  return (
    <BandRow
      lgTone="paper"
      columns={2}
      align="center"
      cells={[
        {
          key: "promise",
          tone: "paper",
          content: (
            <div className="reveal">
              <PageTitle
                title="Every job wants experience. This is where you get it."
                intro="Paid one-day tryouts at businesses near you, with a reference from the business that paid."
              />
            </div>
          ),
        },
        { key: "example", tone: "mist", content: <ExampleTryout /> },
      ]}
    />
  );
}
