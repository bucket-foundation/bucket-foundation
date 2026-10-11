import type { Metadata } from "next";
import { loadTechnologyWaves, wrapWords, yearLabel } from "@/lib/research-maps/corpus-maps";
import MapFigure, { LegendItem } from "../MapFigure";

export const metadata: Metadata = { title: "Technology waves", robots: { index: false, follow: false } };

const W = 1500;
const MADE = "#1F4F4F";
const ENDED = "#B8861E";
const LINE = 17;

export default function Page() {
  const d = loadTechnologyWaves();
  const maxTech = Math.max(...d.waves.map((w) => w.technologies));
  let y = 34;
  const rows = d.waves.map((w) => {
    const made = wrapWords(w.made.join("; "), 44);
    const ended = wrapWords(w.ended.join("; "), 44);
    const h = Math.max(2, made.length, ended.length) * LINE + 22;
    const row = { w, made, ended, y, h };
    y += h;
    return row;
  });
  const wavesHeight = y + 6;
  const peakTop = 30;
  const LAG_X = 470;
  const year = (v: number) => LAG_X + ((v - 1800) / 220) * (W - LAG_X - 150);
  const peakHeight = peakTop + d.peakLags.length * 34 + 40;
  const timed = d.waves.filter((w) => w.trainingLags.length > 0);
  const lag = (v: number) => LAG_X + (v / 100) * (W - LAG_X - 150);
  const trainHeight = 30 + timed.length * 34 + 40;
  const heading = "mb-2 mt-8 font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]";
  return (
    <MapFigure
      eyebrow="Research map · history"
      title="Technology waves"
      deck="Fourteen waves of technology, the work each made and the work each ended, and how long work and training took to follow an invention. The lag samples are small and are printed with their counts."
      footer={`${d.date}. ${d.counts.technologies.toLocaleString("en-US")} dated technologies, ${d.counts.core} curated. ${d.counts.links} technology to occupation links, ${d.counts.linksVerified} verified. ${d.counts.training} training responses, ${d.trainingLag.n} with a lag. Source: ${d.source}.`}
    >
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1">
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[12px] rounded-[2px]" style={{ background: MADE }} />} label="Work a wave made or grew" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[12px] w-[12px] rounded-[2px]" style={{ background: ENDED }} />} label="Work a wave shrank or ended" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[10px] w-[26px]" style={{ background: "#7FAFA6" }} />} label="Dated technologies in the wave" />
      </div>
      <svg data-waves viewBox={`0 0 ${W} ${wavesHeight}`} className="block h-auto w-full" role="img" aria-label="Technology waves with the work each made and ended">
        {[
          [0, "WAVE"],
          [330, "TECHNOLOGIES"],
          [620, "WORK MADE OR GROWN"],
          [1010, "WORK SHRUNK OR ENDED"],
          [1400, "TRAINING"],
        ].map(([x, label]) => (
          <text key={label} x={x} y={16} fontSize={12} fontWeight={700} letterSpacing="0.1em" fill="#3A3529">
            {label}
          </text>
        ))}
        {rows.map(({ w, made, ended, y: top, h }, i) => (
          <g key={w.id} data-wave={w.id}>
            <title>{`${w.name}: ${w.technologies} technologies, ${w.made.length} kinds of work made or grown, ${w.ended.length} shrunk or ended, ${w.training} training responses`}</title>
            {i % 2 === 0 && <rect x={0} y={top - 4} width={W} height={h} fill="rgba(31,28,22,0.04)" />}
            <text x={0} y={top + 16} fontSize={16} fontWeight={700} fill="#1F1C16">
              {w.name}
            </text>
            <text x={0} y={top + 34} fontSize={13} fill="#6F6A5E">
              {yearLabel(w.from)} to {yearLabel(w.to)}
            </text>
            <rect x={330} y={top + 4} width={Math.max(2, (w.technologies / maxTech) * 190)} height={14} rx={2} fill="#7FAFA6" />
            <text x={330 + (w.technologies / maxTech) * 190 + 8} y={top + 16} fontSize={14} fill="#1F1C16">
              {w.technologies.toLocaleString("en-US")}
            </text>
            {made.length > 0 && <rect x={604} y={top + 5} width={9} height={9} rx={2} fill={MADE} />}
            {made.map((line, k) => (
              <text key={k} x={620} y={top + 15 + k * LINE} fontSize={14} fill="#1F1C16">
                {line}
              </text>
            ))}
            {ended.length > 0 && <rect x={994} y={top + 5} width={9} height={9} rx={2} fill={ENDED} />}
            {ended.map((line, k) => (
              <text key={k} x={1010} y={top + 15 + k * LINE} fontSize={14} fill="#1F1C16">
                {line}
              </text>
            ))}
            <text x={1400} y={top + 16} fontSize={14} fill={w.training ? "#1F1C16" : "#6F6A5E"}>
              {w.training ? `${w.training} responses` : "none on record"}
            </text>
          </g>
        ))}
      </svg>
      <h2 className={heading}>
        Invention to peak employment, n = {d.peakLag.n}, median {d.peakLag.median} years
      </h2>
      <svg data-peak-lags viewBox={`0 0 ${W} ${peakHeight}`} className="block h-auto w-full" role="img" aria-label="Years from an invention to the peak employment of the work it made">
        {[1800, 1850, 1900, 1950, 2000].map((t) => (
          <g key={t}>
            <line x1={year(t)} y1={peakTop - 8} x2={year(t)} y2={peakHeight - 30} stroke="rgba(31,28,22,0.14)" />
            <text x={year(t)} y={peakHeight - 10} textAnchor="middle" fontSize={13} fill="#6F6A5E">
              {t}
            </text>
          </g>
        ))}
        {d.peakLags.map((l, i) => {
          const top = peakTop + i * 34;
          return (
            <g key={l.occupation} data-peak={l.occupation}>
              <title>{`${l.technology} ${l.from}, ${l.occupation} peaked ${l.to}: ${l.years} years`}</title>
              <text x={LAG_X - 12} y={top + 15} textAnchor="end" fontSize={14.5} fill="#1F1C16">
                {l.occupation.charAt(0).toUpperCase() + l.occupation.slice(1)}
                <tspan fill="#6F6A5E">{`, after the ${l.technology.toLowerCase()}`}</tspan>
              </text>
              <rect x={year(l.from)} y={top + 2} width={year(l.to) - year(l.from)} height={18} rx={3} fill={MADE} />
              <text x={year(l.to) + 8} y={top + 16} fontSize={14} fontWeight={700} fill="#1F1C16">
                {l.years} years
              </text>
            </g>
          );
        })}
      </svg>
      <h2 className={heading}>
        Invention to the training response, n = {d.trainingLag.n}, median {d.trainingLag.median} years
      </h2>
      <svg data-training-lags viewBox={`0 0 ${W} ${trainHeight}`} className="block h-auto w-full" role="img" aria-label="Years from an invention to a school, act or body that trained for it">
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={lag(t)} y1={18} x2={lag(t)} y2={trainHeight - 30} stroke="rgba(31,28,22,0.14)" />
            <text x={lag(t)} y={trainHeight - 10} textAnchor="middle" fontSize={13} fill="#6F6A5E">
              {t} years
            </text>
          </g>
        ))}
        {timed.map((w, i) => {
          const top = 30 + i * 34;
          return (
            <g key={w.id} data-training={w.id}>
              <title>{`${w.name}: ${w.trainingLags.length} training responses with a lag, ${w.trainingLags[0]} to ${w.trainingLags[w.trainingLags.length - 1]} years`}</title>
              <text x={LAG_X - 12} y={top + 15} textAnchor="end" fontSize={14.5} fill="#1F1C16">
                {w.name}
                <tspan fill="#6F6A5E">{`, n = ${w.trainingLags.length}`}</tspan>
              </text>
              <line x1={lag(0)} y1={top + 11} x2={lag(100)} y2={top + 11} stroke="rgba(31,28,22,0.1)" />
              {w.trainingLags.map((v, k) => (
                <circle key={k} cx={lag(v)} cy={top + 11} r={6} fill={ENDED} fillOpacity={0.55} stroke="#EFE8D4" strokeWidth={1.2} />
              ))}
            </g>
          );
        })}
      </svg>
    </MapFigure>
  );
}
