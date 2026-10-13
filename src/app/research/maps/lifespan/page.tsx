import type { Metadata } from "next";
import { ageLabel, heat, loadLifespan, sentenceCase, wrapWords } from "@/lib/research-maps/corpus-maps";
import MapFigure, { LegendItem } from "../MapFigure";

export const metadata: Metadata = { title: "Learning across a life", robots: { index: false, follow: false } };

const W = 1500;
const X0 = 190;
const ROW = 58;

export default function Page() {
  const d = loadLifespan();
  const cols = d.bins.length - 1;
  const cw = (W - X0) / cols;
  const max = Math.max(...d.cells.map((c) => c.rows));
  const binOf = (age: number) => d.bins.findIndex((edge, i) => i < cols && age >= edge && age < d.bins[i + 1]);
  const fieldsIn = (b: number) => d.fields.filter((f) => binOf(f.age) === b).sort((a, c) => c.rows - a.rows).slice(0, 4);
  const top = 40;
  const gridBottom = top + d.kinds.length * ROW;
  const height = gridBottom + 190;
  return (
    <MapFigure
      eyebrow="Research map · corpus"
      title="Learning across a life"
      deck="What a person learns at each age, from birth to old age, by the kind of knowing it is. The corpus is dense in the first five years and thin after sixty-five."
      footer={`${d.date}. ${d.rows} rows, ${d.aged} with an age, ${d.verified} verified. A row sits in the column of its starting age. The fields under each column are the largest whose median starting age falls there. Source: ${d.source}.`}
    >
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[22px]" style={{ background: heat(1, max).fill }} />} label="1 row" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[22px]" style={{ background: heat(max, max).fill }} />} label={`${max} rows`} />
      </div>
      <svg data-lifespan viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" role="img" aria-label="Rows by kind of knowing and age">
        {Array.from({ length: cols }, (_, b) => (
          <text key={b} x={X0 + b * cw + cw / 2} y={24} textAnchor="middle" fontSize={15} fontWeight={700} fill="#3A3529">
            {ageLabel(d.bins, b)}
          </text>
        ))}
        {d.kinds.map((kind, r) => (
          <g key={kind} data-kind={kind}>
            <text x={X0 - 14} y={top + r * ROW + ROW / 2 + 6} textAnchor="end" fontSize={17} fill="#1F1C16">
              {sentenceCase(kind)}
            </text>
            {Array.from({ length: cols }, (_, b) => {
              const cell = d.cells.find((c) => c.kind === kind && c.bin === b);
              const shade = heat(cell?.rows ?? 0, max);
              return (
                <g key={b} data-cell={`${kind}-${b}`}>
                  <title>{`${sentenceCase(kind)}, age ${ageLabel(d.bins, b).toLowerCase()}: ${cell?.rows ?? 0} rows, ${cell?.verified ?? 0} verified`}</title>
                  <rect x={X0 + b * cw + 1.5} y={top + r * ROW + 1.5} width={cw - 3} height={ROW - 3} rx={3} fill={shade.fill} stroke={cell ? "none" : "rgba(31,28,22,0.12)"} />
                  {cell && (
                    <text x={X0 + b * cw + cw / 2} y={top + r * ROW + ROW / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={shade.ink}>
                      {cell.rows}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
        <text x={X0 - 14} y={gridBottom + 34} textAnchor="end" fontSize={13} fontWeight={700} letterSpacing="0.1em" fill="#3A3529">
          FIELDS
        </text>
        {Array.from({ length: cols }, (_, b) => {
          let line = 0;
          return (
            <g key={b} data-fields={b}>
              {fieldsIn(b).map((f) => {
                const lines = wrapWords(`${sentenceCase(f.field)}, ${f.rows}`, Math.floor(cw / 6.6));
                const start = line;
                line += lines.length + 0.6;
                return lines.map((text, i) => (
                  <text key={`${f.field}-${i}`} x={X0 + b * cw + cw / 2} y={gridBottom + 34 + (start + i) * 16} textAnchor="middle" fontSize={12.5} fill="#2A261E">
                    {text}
                  </text>
                ));
              })}
            </g>
          );
        })}
      </svg>
    </MapFigure>
  );
}
