import type { Metadata } from "next";
import { VERIFIED_BINS, fmt, loadCompleteness } from "@/lib/research-maps/completeness";
import MapFigure, { LegendItem } from "../MapFigure";
import CompletenessHeatmap from "./CompletenessHeatmap";

export const metadata: Metadata = { title: "Completeness heatmap", robots: { index: false, follow: false } };

export default function Page() {
  const data = loadCompleteness();
  return (
    <MapFigure
      eyebrow="Research map · corpus"
      title="Completeness heatmap"
      deck={`An independent critic scored the progressions corpus at ${data.overall.toFixed(1)} of 10 across seven dimensions of what a person can learn, and each cell prints the verified rows it holds.`}
      footer={`${data.date}. ${fmt(data.scoredCells)} scored cells of ${fmt(data.frameCells)} in the critic's frame, counted over ${fmt(data.corpusRows)} corpus rows of which ${fmt(data.corpusVerified)} are verified. Counts outside life stage and geography come from keyword matches on titles and run high. Source: ${data.source}.`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[clamp(0.72rem,0.8vw,0.95rem)] font-semibold text-[color:var(--basalt)]">Verified rows in a cell</span>
        {VERIFIED_BINS.map((b) => (
          <LegendItem
            key={b.label}
            swatch={<span aria-hidden className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: b.fill, border: b.min === 0 ? "1px solid rgba(31,28,22,0.3)" : "none" }} />}
            label={b.label}
          />
        ))}
        <LegendItem
          swatch={
            <svg aria-hidden width={13} height={13} viewBox="0 0 13 13">
              <polygon points="0,0 13,0 13,13" fill="#B8861E" />
            </svg>
          }
          label="Gold corner: holds verified rows and fails the dimension's stricter test"
        />
      </div>
      <CompletenessHeatmap data={data} />
    </MapFigure>
  );
}
