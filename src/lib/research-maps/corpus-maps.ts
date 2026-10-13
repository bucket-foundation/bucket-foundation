import backtest from "@/data/research-maps/forecast-backtest.json";
import evidence from "@/data/research-maps/evidence-market.json";
import lifespan from "@/data/research-maps/lifespan.json";
import school from "@/data/research-maps/school-map.json";
import waves from "@/data/research-maps/technology-waves.json";

export type Interval = { value: number; low: number | null; high: number | null };
export type BacktestOrigin = { origin: number; target: number; occupations: number; damping: number | null; naive: number; damped: number; ratio: Interval; result: string };
export type BacktestBls = { origin: number; target: number; occupations: number; naive: number; bls: Interval; damped: number };
export type Backtest = {
  date: string | null;
  source: string;
  origins: BacktestOrigin[];
  bls: BacktestBls[];
  pass: { needed: number; wins: number; passed: boolean; forecastIssued: boolean } | null;
  bootstrapDraws?: number;
};

export const loadBacktest = (): Backtest => backtest as Backtest;
export const loadEvidenceMarket = () => evidence;
export const loadLifespan = () => lifespan;
export const loadSchoolMap = () => school;
export const loadTechnologyWaves = () => waves;

export function backtestVerdict(b: Backtest): string {
  if (!b.pass || b.origins.length === 0) return "No backtest results yet.";
  const outcome = b.pass.passed ? "passed" : "failed";
  return `The damped trend ${outcome} its test. It beat the no-change forecast at ${b.pass.wins} of ${b.origins.length} ten-year origins, and the rule needs ${b.pass.needed}.`;
}

const LIGHT = [228, 220, 196];
const DARK = [31, 79, 79];

export function heat(value: number, max: number): { fill: string; ink: string } {
  if (value <= 0 || max <= 0) return { fill: "#EFE8D4", ink: "#6F6A5E" };
  const t = Math.sqrt(Math.min(1, value / max));
  const channel = (i: number) => Math.round(LIGHT[i] + (DARK[i] - LIGHT[i]) * t);
  return { fill: `rgb(${channel(0)},${channel(1)},${channel(2)})`, ink: t > 0.5 ? "#EFE8D4" : "#1F1C16" };
}

export function ageLabel(bins: number[], i: number): string {
  if (i === bins.length - 2) return `${bins[i]} and over`;
  return bins[i] === 0 ? "Under 1" : `${bins[i]} to ${bins[i + 1]}`;
}

export function yearLabel(year: number | null): string {
  if (year === null) return "now";
  if (year <= -1000000) return `${(-year / 1000000).toFixed(1)} million BC`;
  return year < 0 ? `${(-year).toLocaleString("en-US")} BC` : String(year);
}

export function wrapWords(text: string, chars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > chars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export const sentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
