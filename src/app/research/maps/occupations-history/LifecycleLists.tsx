import { clip, logScale, type ExtinctRow, type NewestRow } from "@/lib/research-maps/occupations-history";

const fmt = (n: number): string => n.toLocaleString("en-US");
const ROW = 15;
const TOP = 52;
const LABEL_CHARS = 52;
export const GONE = "#1F1C16";
export const FADING = "#B8861E";
export const NEW_SOC = "#2E6B6B";

const EX = { label: 310, x0: 322, x1: 630, text: 640, first: 1880, last: 2025 };
const NW = { label: 1080, x0: 1094, x1: 1372, text: 1384 };
const DECADES = [1000, 10000, 100000, 1000000, 10000000];
const DECADE_LABEL = ["1k", "10k", "100k", "1M", "10M"];

const signed = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export default function LifecycleLists({ extinct, newest }: { extinct: ExtinctRow[]; newest: NewestRow[] }) {
  const rows = Math.max(extinct.length, newest.length);
  const bottom = TOP + rows * ROW;
  const year = (y: number) => EX.x0 + ((y - EX.first) / (EX.last - EX.first)) * (EX.x1 - EX.x0);
  const jobs = logScale(1000, 10000000, NW.x0, NW.x1);
  return (
    <svg data-lifecycle-lists viewBox={`0 0 1500 ${bottom + 8}`} className="block h-auto w-full" role="img" aria-label="The fifty largest extinct or near-extinct occupations and the fifty newest">
      <text x={0} y={12} fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
        FIFTY LARGEST EXTINCT OR NEAR-EXTINCT, BY PEAK EMPLOYMENT
      </text>
      <text x={EX.text} y={38} fontSize={10} fill="#6F6A5E">
        Peak employment
      </text>
      {[1880, 1920, 1960, 2000].map((y) => (
        <g key={y}>
          <line x1={year(y)} x2={year(y)} y1={TOP - 8} y2={bottom} stroke="#1F1C16" strokeOpacity={0.12} strokeWidth={0.7} />
          <text x={year(y)} y={38} textAnchor="middle" fontSize={10} fill="#3A3529">
            {y}
          </text>
        </g>
      ))}
      {extinct.map((r, i) => {
        const y = TOP + i * ROW;
        const colour = r.gone ? GONE : FADING;
        return (
          <g key={r.title} data-extinct={i + 1} data-gone={r.gone}>
            <title>{`${r.title}. First listed ${r.first}, peak ${fmt(r.peakEmployment)} in ${r.peak}, ${fmt(r.lastEmployment)} in ${r.last}. Last share is ${r.ratio.toFixed(2)} of peak share. ${r.gone ? "Left the classification" : "Still listed"}. Basis: ${r.basis === "census" ? "census counts" : "OEWS estimates"}.`}</title>
            <text x={EX.label} y={y + 3.6} textAnchor="end" fontSize={10.5} fill="#1F1C16">
              {clip(r.title, LABEL_CHARS)}
            </text>
            <line x1={year(r.first)} x2={year(r.last)} y1={y} y2={y} stroke={colour} strokeWidth={2} />
            {r.gone && <line x1={year(r.last)} x2={year(r.last)} y1={y - 4.5} y2={y + 4.5} stroke={colour} strokeWidth={2} />}
            <circle cx={year(r.peak)} cy={y} r={3.6} fill={colour} stroke="#EFE8D4" strokeWidth={0.8} />
            <text x={EX.text} y={y + 3.6} fontSize={10} fill="#3A3529">{`${fmt(r.peakEmployment)} in ${r.peak}`}</text>
          </g>
        );
      })}
      <text x={770} y={12} fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
        FIFTY NEWEST, BY FIRST LISTING
      </text>
      <text x={NW.x0} y={24} fontSize={10} fill="#6F6A5E">
        Latest employment, log scale
      </text>
      <text x={NW.text} y={24} fontSize={10} fill="#6F6A5E">
        Projected 2024 to 2034
      </text>
      {DECADES.map((v, i) => (
        <g key={v}>
          <line x1={jobs(v)} x2={jobs(v)} y1={TOP - 8} y2={bottom} stroke="#1F1C16" strokeOpacity={0.12} strokeWidth={0.7} />
          <text x={jobs(v)} y={38} textAnchor="middle" fontSize={10} fill="#3A3529">
            {DECADE_LABEL[i]}
          </text>
        </g>
      ))}
      {newest.map((r, i) => {
        const y = TOP + i * ROW;
        return (
          <g key={r.title} data-newest={i + 1}>
            <title>{`${r.title}. First listed ${r.first} in ${r.scheme}. ${r.employment == null ? "No employment count held" : `Latest employment ${fmt(r.employment)}`}${r.change == null ? "" : `, projected ${signed(r.change)} from 2024 to 2034`}.`}</title>
            <text x={NW.label} y={y + 3.6} textAnchor="end" fontSize={10.5} fill="#1F1C16">
              {clip(r.title, LABEL_CHARS)}
              <tspan fill="#6F6A5E" fontSize={10}>{`  ${r.first}`}</tspan>
            </text>
            {r.employment == null ? (
              <text x={NW.x0} y={y + 3.6} fontSize={10} fill="#6F6A5E">
                O*NET-SOC 2019 title, no count held
              </text>
            ) : (
              <>
                <circle cx={jobs(r.employment)} cy={y} r={3.6} fill={NEW_SOC} />
                <text x={NW.text} y={y + 3.6} fontSize={10} fill="#3A3529">
                  {r.change == null ? "" : signed(r.change)}
                  <tspan fill="#6F6A5E">{`  ${fmt(r.employment)} jobs`}</tspan>
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
