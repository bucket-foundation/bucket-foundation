import type { Metadata } from "next";
import { heat, loadSchoolMap } from "@/lib/research-maps/corpus-maps";
import { squarify } from "@/lib/research-maps/treemap";
import MapFigure, { LegendItem } from "../MapFigure";

export const metadata: Metadata = { title: "School map", robots: { index: false, follow: false } };

const CELL = 15;
const LABEL = 200;
const PER_ROW = 5;
const GAP = 26;

export default function Page() {
  const d = loadSchoolMap();
  const pw = d.grades.length * CELL;
  const ph = d.subjects.length * CELL;
  const blockH = ph + 74;
  const width = LABEL + PER_ROW * (pw + GAP);
  const height = Math.ceil(d.panels.length / PER_ROW) * blockH;
  const apW = 1500;
  const apH = 560;
  const tiles = squarify(d.ap.courses, (c) => c.units, { x: 0, y: 0, w: apW, h: apH });
  const heading = "font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]";
  return (
    <MapFigure
      eyebrow="Research map · corpus"
      title="School map"
      deck="What school teaches in each grade, system by system. Each square is a subject in a grade, darker where the corpus holds more standards for it."
      footer={`${d.date}. ${d.standards.toLocaleString("en-US")} standards from ${d.systems} systems and frameworks, ${d.verified.toLocaleString("en-US")} verified. Shade is scaled inside each panel, so panels compare shape and their row counts compare size. ${d.ap.courses.length} AP courses hold ${d.ap.units} units. Source: ${d.source}.`}
    >
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1">
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[12px] border border-[color:var(--hairline)]" style={{ background: "#EFE8D4" }} />} label="No standard held" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[12px]" style={{ background: heat(1, 100).fill }} />} label="Few" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[12px]" style={{ background: heat(100, 100).fill }} />} label="The most in that system" />
      </div>
      <h2 className={`${heading} mb-2`}>Subject by grade in {d.panels.length} systems</h2>
      <svg data-school-matrix viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Subject by grade matrix for each school system">
        {d.panels.map((p, i) => {
          const col = i % PER_ROW;
          const row = Math.floor(i / PER_ROW);
          const x0 = LABEL + col * (pw + GAP);
          const y0 = row * blockH + 44;
          const max = Math.max(...p.cells.map((c) => c[2]));
          return (
            <g key={p.id} data-system={p.id}>
              <text x={x0} y={y0 - 24} fontSize={15} fontWeight={700} fill="#1F1C16">
                {p.title}
              </text>
              <text x={x0} y={y0 - 8} fontSize={11.5} fill="#6F6A5E">
                {p.region}, {p.rows.toLocaleString("en-US")} rows
              </text>
              {col === 0 &&
                d.subjects.map((s, k) => (
                  <text key={s} x={LABEL - 10} y={y0 + k * CELL + 11.5} textAnchor="end" fontSize={11.5} fill="#2A261E">
                    {s}
                  </text>
                ))}
              <rect x={x0} y={y0} width={pw} height={ph} fill="#EFE8D4" stroke="rgba(31,28,22,0.18)" strokeWidth={0.6} />
              {p.cells.map(([s, g, n]) => (
                <rect key={`${s}-${g}`} x={x0 + g * CELL + 0.75} y={y0 + s * CELL + 0.75} width={CELL - 1.5} height={CELL - 1.5} rx={1.5} fill={heat(n, max).fill}>
                  <title>{`${p.title}, ${d.subjects[s]}, grade ${d.grades[g]}: ${n} standards`}</title>
                </rect>
              ))}
              {d.grades.map((g, k) => (
                <text key={g} x={x0 + k * CELL + CELL / 2} y={y0 + ph + 13} textAnchor="middle" fontSize={10} fill="#6F6A5E">
                  {g}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <h2 className={`${heading} mb-2 mt-8`}>
        {d.ap.courses.length} Advanced Placement courses sized by units
      </h2>
      <svg data-ap-tiles viewBox={`0 0 ${apW} ${apH}`} className="block h-auto w-full" role="img" aria-label="Advanced Placement courses sized by their number of units">
        {tiles.map(({ item, rect }) => {
          const chars = Math.floor((rect.w - 14) / 8.2);
          const name = item.name.length > chars ? item.name.slice(0, Math.max(1, chars - 1)).trimEnd() + "…" : item.name;
          return (
            <g key={item.name} data-ap={item.name}>
              <title>{`AP ${item.name}: ${item.units} units, ${item.subject}`}</title>
              <rect x={rect.x + 1.5} y={rect.y + 1.5} width={rect.w - 3} height={rect.h - 3} rx={3} fill={heat(item.units, 14).fill} />
              <text x={rect.x + 8} y={rect.y + 21} fontSize={13.5} fontWeight={700} fill={heat(item.units, 14).ink}>
                {name}
              </text>
              <text x={rect.x + 8} y={rect.y + 39} fontSize={12.5} fill={heat(item.units, 14).ink}>
                {item.units} units
              </text>
            </g>
          );
        })}
      </svg>
    </MapFigure>
  );
}
