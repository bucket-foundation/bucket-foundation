import type { Metadata } from "next";
import { STATUS_LABEL, loadCoverage, type CoverageScheme, type CoverageStatus } from "@/lib/research-maps/coverage";
import MapFigure, { LegendItem } from "../MapFigure";
import CoverageTreemap, { STATUS_FILL } from "./CoverageTreemap";

export const metadata: Metadata = { title: "Knowledge coverage map", robots: { index: false, follow: false } };

const STATUSES: CoverageStatus[] = ["empty", "thin", "covered"];

function Scheme({ scheme, heading, sizing }: { scheme: CoverageScheme; heading: string; sizing: string }) {
  return (
    <section data-scheme={scheme.id} className="min-w-0">
      <h2 className="font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]">{heading}</h2>
      <p className="mb-3 mt-1 text-[clamp(0.78rem,0.85vw,1rem)] leading-[1.5] text-[color:var(--basalt-3)]">
        {sizing} {scheme.thinRule}
      </p>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
        {STATUSES.map((s) => (
          <LegendItem
            key={s}
            swatch={<span aria-hidden className="inline-block h-[12px] w-[12px] rounded-[2px]" style={{ background: STATUS_FILL[s], border: s === "empty" ? "1px solid rgba(31,28,22,0.25)" : "none" }} />}
            label={`${STATUS_LABEL[s]}, ${scheme.counts[s]} of ${scheme.total}`}
          />
        ))}
      </div>
      <CoverageTreemap scheme={scheme} />
    </section>
  );
}

export default function Page() {
  const data = loadCoverage();
  return (
    <MapFigure
      eyebrow="Research map · corpus"
      title="Knowledge coverage map"
      deck="Every field a person can major in and every group of careers, sized by how much there is to learn and coloured by what the progressions corpus holds today."
      footer={`${data.date}. ${data.cip.total} CIP 2020 four-digit families and ${data.soc.total} SOC 2018 minor groups. Hover a cell for its counts. Two reserved CIP series hold no programs and take no area.`}
    >
      <div className="grid gap-8 xl:grid-cols-2">
        <Scheme scheme={data.cip} heading="Majors by CIP series and family" sizing="Each cell is a four-digit family sized by its six-digit programs, grouped by two-digit series." />
        <Scheme scheme={data.soc} heading="Careers by SOC major and minor group" sizing="Each cell is a minor group sized by its detailed occupations, grouped by major group." />
      </div>
    </MapFigure>
  );
}
