import type { Metadata } from "next";
import { loadEvidenceMarket, sentenceCase } from "@/lib/research-maps/corpus-maps";
import MapFigure, { LegendItem } from "../MapFigure";

export const metadata: Metadata = { title: "Evidence against market", robots: { index: false, follow: false } };

const ALL = "#7FAFA6";
const STUDY = "#1F4F4F";
const W = 1120;
const X0 = 372;

function Rows({ id, rows, max, badge }: { id: string; rows: { label: string; total: number; controlled: number; grade?: string | null }[]; max: number; badge?: boolean }) {
  const x = (v: number) => (v / max) * (W - X0 - 150);
  return (
    <svg data-evidence={id} viewBox={`0 0 ${W} ${rows.length * 46 + 10}`} className="block h-auto w-full" role="img" aria-label={`${id} with and without a controlled study`}>
      {rows.map((r, i) => {
        const y = 8 + i * 46;
        return (
          <g key={r.label} data-row={r.label}>
            <title>{`${r.label}: ${r.total} products, ${r.controlled} with a controlled study`}</title>
            {badge && (
              <g>
                <rect x={0} y={y + 2} width={30} height={24} rx={4} fill={r.grade ? "#B8861E" : "transparent"} stroke={r.grade ? "#B8861E" : "rgba(31,28,22,0.4)"} strokeDasharray={r.grade ? undefined : "3 3"} />
                <text x={15} y={y + 20} textAnchor="middle" fontSize={15} fontWeight={700} fill={r.grade ? "#FBF7EA" : "#6F6A5E"}>
                  {r.grade ?? "·"}
                </text>
              </g>
            )}
            <text x={X0 - 12} y={y + 20} textAnchor="end" fontSize={16} fill="#1F1C16">
              {sentenceCase(r.label)}
            </text>
            <rect x={X0} y={y} width={x(r.total)} height={28} rx={3} fill={ALL} />
            {r.controlled > 0 && <rect x={X0} y={y} width={x(r.controlled)} height={28} rx={3} fill={STUDY} />}
            <text x={X0 + x(r.total) + 8} y={y + 20} fontSize={15} fill="#1F1C16">
              {r.total}
              <tspan fill="#6F6A5E">{`, ${r.controlled} with a study`}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const Swatch = ({ fill }: { fill: string }) => <span aria-hidden className="inline-block h-[12px] w-[22px] rounded-[2px]" style={{ background: fill }} />;

export default function Page() {
  const d = loadEvidenceMarket();
  const levels = d.levels.map((l) => ({ label: l.level, total: l.players, controlled: l.controlled }));
  const methods = d.methods.map((m) => ({ label: m.method, total: m.products, controlled: m.controlled, grade: m.grade }));
  return (
    <MapFigure
      eyebrow="Research map · evidence"
      title="Evidence against market"
      deck={`${d.controlled} of ${d.players} learning products hold an independent controlled study of learning. The studies sit in school years, and the methods with the best evidence are the ones most products use.`}
      footer={`${d.date}. ${d.players} products, ${d.links.toLocaleString("en-US")} cross-index links, ${d.unmatched} products matched to no method. A product can serve several levels, so level counts sum past ${d.players}. Source: ${d.source}.`}
    >
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1">
        <LegendItem swatch={<Swatch fill={ALL} />} label="Products" />
        <LegendItem swatch={<Swatch fill={STUDY} />} label="Of those, with a controlled study" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[14px] w-[18px] rounded-[3px]" style={{ background: "#B8861E" }} />} label="Evidence grade of the method, A or B" />
      </div>
      <div className="grid gap-10 xl:grid-cols-2">
        <section className="min-w-0">
          <h2 className="mb-3 font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]">Products by level</h2>
          <Rows id="levels" rows={levels} max={Math.max(...levels.map((l) => l.total))} />
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]">Learning methods by products using them</h2>
          <Rows id="methods" rows={methods} max={Math.max(...levels.map((l) => l.total))} badge />
          <h3 className="mb-2 mt-6 font-display text-[clamp(0.85rem,1vw,1.15rem)] uppercase text-[color:var(--basalt)]">Methods with a confirmed effect and no product</h3>
          <ul data-unused className="flex flex-wrap gap-2">
            {d.unused.map((m) => (
              <li key={m} className="border border-dashed border-[color:var(--stone-carve)] px-3 py-1 text-[clamp(0.8rem,0.85vw,1rem)] text-[color:var(--basalt-2)]">
                {sentenceCase(m)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </MapFigure>
  );
}
