import { KIND_FILL, KIND_LABEL, layoutStrip, type YearCount } from "@/lib/research-maps/occupations-history";

const fmt = (n: number): string => n.toLocaleString("en-US");
const X0 = 250;
const X1 = 1480;
const FIRST = 1876;
const LAST = 2027;
const ROW = 118;
const BAR = 96;
const TICKS = [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020];

export default function LifecycleStrip({ strips }: { strips: { id: string; label: string; note: string; rows: YearCount[] }[] }) {
  const x = (year: number) => X0 + ((year - FIRST) / (LAST - FIRST)) * (X1 - X0);
  const height = strips.length * ROW + 34;
  return (
    <svg data-lifecycle-strip viewBox={`0 0 1500 ${height}`} className="block h-auto w-full" role="img" aria-label="Occupation lineages by year first listed, year of peak employment and year they left the classification">
      {TICKS.map((year) => (
        <g key={year}>
          <line x1={x(year)} x2={x(year)} y1={8} y2={strips.length * ROW + 8} stroke="#1F1C16" strokeOpacity={0.1} strokeWidth={0.7} />
          <text x={x(year)} y={strips.length * ROW + 24} textAnchor="middle" fontSize={10.5} fill="#3A3529">
            {year}
          </text>
        </g>
      ))}
      {strips.map((strip, i) => {
        const baseline = (i + 1) * ROW;
        const { columns, max } = layoutStrip(strip.rows, x, baseline, BAR);
        const total = columns.reduce((a, c) => a + c.total, 0);
        return (
          <g key={strip.id} data-strip={strip.id}>
            <text x={0} y={baseline - 62} fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
              {strip.label.toUpperCase()}
            </text>
            <text x={0} y={baseline - 46} fontSize={10.5} fill="#1F1C16">{`${fmt(total)} lineage records`}</text>
            <text x={0} y={baseline - 31} fontSize={10} fill="#6F6A5E">
              {strip.note}
            </text>
            <text x={0} y={baseline - 17} fontSize={10} fill="#6F6A5E">{`Tallest column ${fmt(max)}`}</text>
            <line x1={X0} x2={X1} y1={baseline} y2={baseline} stroke="#1F1C16" strokeOpacity={0.45} strokeWidth={0.8} />
            {columns.map((c) => (
              <g key={c.year} data-year={c.year}>
                <title>{`${strip.label}, ${c.year}: ${fmt(c.total)} records. ${c.parts.map((p) => `${KIND_LABEL[p.kind]} ${fmt(p.count)}`).join(", ")}.`}</title>
                {c.parts.map((p) => (
                  <rect key={p.kind} x={c.x - 3.2} y={p.y} width={6.4} height={Math.max(p.h, 0.8)} fill={KIND_FILL[p.kind]} />
                ))}
                {c.labelled && (
                  <text x={c.x} y={baseline - (c.total / max) * BAR - 4} textAnchor="middle" fontSize={10} fill="#1F1C16">
                    {fmt(c.total)}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
