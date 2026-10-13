import type { Metadata } from "next";
import { backtestVerdict, loadBacktest } from "@/lib/research-maps/corpus-maps";
import MapFigure, { LegendItem } from "../MapFigure";

export const metadata: Metadata = { title: "Forecast backtest", robots: { index: false, follow: false } };

const NAIVE = "#A79F8C";
const TREND = "#1F4F4F";
const BLS = "#B8861E";
const W = 1500;
const X0 = 330;
const MAX = 22;
const x = (v: number) => X0 + (v / MAX) * (W - X0 - 190);

function Bar({ y, value, fill, label }: { y: number; value: number; fill: string; label: string }) {
  return (
    <g>
      <rect x={X0} y={y} width={x(value) - X0} height={20} rx={3} fill={fill} />
      <text x={x(value) + 8} y={y + 15} fontSize={15} fill="#1F1C16">
        {label}
      </text>
    </g>
  );
}

const Swatch = ({ fill }: { fill: string }) => <span aria-hidden className="inline-block h-[12px] w-[22px] rounded-[2px]" style={{ background: fill }} />;

export default function Page() {
  const b = loadBacktest();
  const verdict = backtestVerdict(b);
  if (!b.pass || b.origins.length === 0) {
    return (
      <MapFigure eyebrow="Research map · forecast" title="Forecast backtest" deck={verdict} footer="The backtest has not been run.">
        <p data-backtest-empty className="text-[18px] text-[color:var(--basalt-2)]">
          No backtest results yet.
        </p>
      </MapFigure>
    );
  }
  const row = 92;
  const h1 = 60 + b.origins.length * row;
  const h2 = 60 + b.bls.length * (row + 24);
  return (
    <MapFigure
      eyebrow="Research map · forecast"
      title="Forecast backtest"
      deck={verdict}
      footer={`${b.date}. Error is 100 times the summed gap between forecast and actual employment shares, so a shorter bar is better. Intervals are 95 percent from ${(b.bootstrapDraws ?? 0).toLocaleString("en-US")} bootstrap draws. No 2034 forecast is issued.`}
    >
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
        <LegendItem swatch={<Swatch fill={NAIVE} />} label="No change, the naive forecast" />
        <LegendItem swatch={<Swatch fill={TREND} />} label="Damped trend, the method under test" />
        <LegendItem swatch={<Swatch fill={BLS} />} label="BLS projection" />
      </div>
      <div className="mx-auto max-w-[1900px]">
        <h2 className="font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]">Four origins against no change</h2>
        <svg data-backtest="origins" viewBox={`0 0 ${W} ${h1}`} className="block h-auto w-full" role="img" aria-label="Ten-year forecast error by origin">
          {b.origins.map((o, i) => {
            const y = 20 + i * row;
            const mark = o.result === "win" ? TREND : o.result === "loss" ? "#9E3A24" : "#6F6A5E";
            return (
              <g key={o.origin} data-origin={o.origin} data-result={o.result}>
                <title>{`${o.origin} to ${o.target}: naive ${o.naive}, damped trend ${o.damped}, ${o.occupations} occupations`}</title>
                <text x={0} y={y + 22} fontSize={24} fontWeight={700} fill="#1F1C16">
                  {o.origin} to {o.target}
                </text>
                <text x={0} y={y + 46} fontSize={14} fill="#6F6A5E">
                  {o.occupations} occupations{o.damping === null ? ", no trend data" : `, damping ${o.damping}`}
                </text>
                <Bar y={y} value={o.naive} fill={NAIVE} label={o.naive.toFixed(2)} />
                <Bar y={y + 26} value={o.damped} fill={TREND} label={o.damped.toFixed(2)} />
                <text x={W - 6} y={y + 30} textAnchor="end" fontSize={22} fontWeight={700} fill={mark}>
                  {o.result.toUpperCase()}
                </text>
                <text x={W - 6} y={y + 50} textAnchor="end" fontSize={13} fill="#6F6A5E">
                  {o.ratio.low === null ? "ratio 1.000" : `ratio ${o.ratio.value.toFixed(3)}, ${o.ratio.low} to ${o.ratio.high}`}
                </text>
              </g>
            );
          })}
        </svg>
        <h2 className="mt-6 font-display text-[clamp(1rem,1.3vw,1.5rem)] uppercase text-[color:var(--basalt)]">Against BLS on the same occupations</h2>
        <svg data-backtest="bls" viewBox={`0 0 ${W} ${h2}`} className="block h-auto w-full" role="img" aria-label="Forecast error against the BLS projections">
          {b.bls.map((o, i) => {
            const y = 20 + i * (row + 24);
            return (
              <g key={o.origin} data-bls={o.origin}>
                <title>{`${o.origin} to ${o.target}: naive ${o.naive}, BLS ${o.bls.value}, damped trend ${o.damped}`}</title>
                <text x={0} y={y + 22} fontSize={24} fontWeight={700} fill="#1F1C16">
                  {o.origin} to {o.target}
                </text>
                <text x={0} y={y + 46} fontSize={14} fill="#6F6A5E">
                  {o.occupations} occupations
                </text>
                <Bar y={y} value={o.naive} fill={NAIVE} label={o.naive.toFixed(2)} />
                <Bar y={y + 26} value={o.bls.value} fill={BLS} label={`${o.bls.value.toFixed(2)}, ${o.bls.low} to ${o.bls.high}`} />
                <Bar y={y + 52} value={o.damped} fill={TREND} label={o.damped.toFixed(2)} />
              </g>
            );
          })}
        </svg>
      </div>
    </MapFigure>
  );
}
