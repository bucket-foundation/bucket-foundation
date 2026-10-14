import type { Metadata } from "next";
import { FAMILY_LABEL, FAMILY_ORDER, FAMILY_RAMP, KIND_FILL, KIND_LABEL, KIND_ORDER, loadOccupationsHistory, mix, percent, shareBands, type Family, type SharePanel } from "@/lib/research-maps/occupations-history";
import MapFigure, { LegendItem } from "../MapFigure";
import LifecycleLists, { FADING, GONE, NEW_SOC } from "./LifecycleLists";
import LifecycleStrip from "./LifecycleStrip";
import ShareStream from "./ShareStream";

export const metadata: Metadata = { title: "Occupations across a century", robots: { index: false, follow: false } };

const fmt = (n: number): string => n.toLocaleString("en-US");

function familyShare(panel: SharePanel, family: Family, at: "first" | "last"): number {
  const i = at === "first" ? 0 : panel.years.length - 1;
  return shareBands(panel)
    .filter((b) => b.family === family)
    .reduce((a, b) => a + b.shares[i], 0);
}

function Section({ id, heading, note, legend, children }: { id: string; heading: string; note: string; legend: React.ReactNode; children: React.ReactNode }) {
  return (
    <section data-section={id} className="mb-10 min-w-0 last:mb-0">
      <h2 className="font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]">{heading}</h2>
      <p className="mb-3 mt-1 max-w-5xl text-[clamp(0.78rem,0.85vw,1rem)] leading-[1.5] text-[color:var(--basalt-3)]">{note}</p>
      <div data-map-legend className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
        {legend}
      </div>
      {children}
    </section>
  );
}

const square = (background: string) => <span aria-hidden className="inline-block h-[12px] w-[12px] rounded-[2px]" style={{ background }} />;
const bar = (background: string) => <span aria-hidden className="inline-block h-[4px] w-[26px]" style={{ background }} />;

export default function Page() {
  const data = loadOccupationsHistory();
  const { census, oews, lifecycle } = data;
  const firstYear = census.years[0];
  const lastYear = census.years[census.years.length - 1];
  const farm = [familyShare(census, "farm", "first"), familyShare(census, "farm", "last")];
  const white = [familyShare(census, "white", "first"), familyShare(census, "white", "last")];
  const gone = lifecycle.extinct.filter((r) => r.gone).length;
  const counted = lifecycle.newest.filter((r) => r.employment != null).length;
  return (
    <MapFigure
      eyebrow="Research map · history of work"
      title="Occupations across a century"
      deck={`Farm work fell from ${percent(farm[0])} to ${percent(farm[1])} percent of the United States labor force between ${firstYear} and ${lastYear} while white-collar work rose from ${percent(white[0])} to ${percent(white[1])} percent, and ${fmt(lifecycle.lineages)} occupation lineages record which kinds of work were listed, peaked and left.`}
      footer={`${data.date}. ${fmt(census.rows)} census group counts, ${fmt(oews.rows)} OEWS group counts and ${fmt(lifecycle.lineages)} lineage records from ${data.source}, which holds ${fmt(data.counts.titles)} titles and ${fmt(data.counts.series)} employment rows. Sources: Historical Statistics of the United States Series D 182-198, BLS OEWS, Census and O*NET classifications.`}
    >
      <Section
        id="share"
        heading="Employment share by major group"
        note={`Each band is one major group, stacked to 100 percent. The census series ends in ${lastYear} and the SOC series starts in ${oews.years[0]} under a different classification, so the two panels stand apart. SOC groups take the colour of the nearest census family, a choice made for this map.`}
        legend={FAMILY_ORDER.slice()
          .reverse()
          .map((f) => (
            <LegendItem key={f} swatch={square(mix(FAMILY_RAMP[f][0], FAMILY_RAMP[f][1], 0.35))} label={`${FAMILY_LABEL[f]}, ${percent(familyShare(census, f, "first"))} percent in ${firstYear}, ${percent(familyShare(oews, f, "last"))} percent in ${oews.years[oews.years.length - 1]}`} />
          ))}
      >
        <ShareStream census={census} oews={oews} />
      </Section>
      <Section
        id="strip"
        heading="When lineages were listed, peaked and left"
        note="Each column counts lineage records by year, and each strip has its own height scale. A year marks a classification held in the corpus: the OEWS series starts in 1999 and O*NET-SOC in 2000, so the tall columns there are the start of the record. One occupation can appear under more than one classification."
        legend={KIND_ORDER.map((k) => (
          <LegendItem key={k} swatch={square(KIND_FILL[k])} label={`${KIND_LABEL[k]}, ${fmt(lifecycle.kinds[k] ?? 0)}`} />
        ))}
      >
        <LifecycleStrip
          strips={[
            { id: "born", label: "First listed", note: "Year a lineage first appears", rows: lifecycle.born },
            { id: "peaked", label: "Peak employment", note: "Census and OEWS lineages with counts", rows: lifecycle.peaked },
            { id: "ended", label: "Left the classification", note: "Lineages with status extinct", rows: lifecycle.ended },
          ]}
        />
      </Section>
      <Section
        id="lists"
        heading="The largest that faded and the newest listed"
        note={`Left: ${lifecycle.extinct.length} of the ${fmt(lifecycle.extinctPool)} lineages that fell to 34 percent of their peak share or less, with a line from first listing to last count and a dot at the peak. Census counts are held for 1950, 1960, 1970, 1990 and 2024 only, so a peak is the largest of those years. Right: ${lifecycle.newest.length} of the ${fmt(lifecycle.emergingPool)} lineages created under a new code and a new title by SOC 2018 or O*NET-SOC 2019; ${counted} carry an employment count.`}
        legend={
          <>
            <LegendItem swatch={bar(GONE)} label={`Left the classification, ${gone}`} />
            <LegendItem swatch={bar(FADING)} label={`Still listed, near-extinct, ${lifecycle.extinct.length - gone}`} />
            <LegendItem swatch={<span aria-hidden className="inline-block h-[9px] w-[9px] rounded-full" style={{ background: NEW_SOC }} />} label={`New SOC 2018 occupation, ${counted}`} />
          </>
        }
      >
        <LifecycleLists extinct={lifecycle.extinct} newest={lifecycle.newest} />
      </Section>
    </MapFigure>
  );
}
