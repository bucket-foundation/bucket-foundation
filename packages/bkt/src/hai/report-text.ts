import { malformedCount, type AiScores } from "./probe";
import { MIN_RETESTED_PROBES_FOR_TREND, type Report } from "./session";
import type { Estimate } from "./stats";

export interface ReportRow {
  text: string;
  meaning?: string;
}

export const GAIN_LABEL = "Gain with AI";
export const RATIO_LABEL = "Ratio with AI";

export function fmt(e: Estimate): string {
  if (e.value === null) return "not enough data";
  const range = e.lo === null || e.hi === null ? "range unknown" : `95% range ${e.lo.toFixed(2)} to ${e.hi.toFixed(2)}`;
  return `${e.value.toFixed(2)} (${range})`;
}

const localTime = (ms: number) => new Date(ms).toLocaleString();

const DEPENDENCE = {
  yes: "Dependence on AI: yes. You score higher with AI and keep no more of it a week later.",
  no: "Dependence on AI: no sign of it.",
  unknown: "Dependence on AI: not enough data yet.",
};

export function reportRows(r: Report, scores: AiScores | null, when: (ms: number) => string = localTime): ReportRow[] {
  const next = { text: r.nextRetest ? `Next retest: ${when(r.nextRetest)}.` : "No retest is waiting." };
  if (!r.summary) return [{ text: "No retested probes yet. Scores appear after the first retest." }, next];
  const s = r.summary;
  const skipped = scores ? malformedCount(scores) : 0;
  return [
    { text: `${s.pairs} question pairs over ${r.retestedProbes} retested probes.` },
    { text: `You alone scored ${s.H.toFixed(2)} and you with AI scored ${s.J.toFixed(2)}. AI alone scored ${s.A.toFixed(2)}. Each score is corrected for guessing.` },
    { text: `${GAIN_LABEL}: ${fmt(s.D)}.`, meaning: "Your score with AI minus the better of you alone and AI alone." },
    { text: `${RATIO_LABEL}: ${fmt(s.m)}.`, meaning: "Your score with AI divided by the better of you alone and AI alone." },
    ...(skipped ? [{ text: `${skipped} unreadable AI replies were left out.` }] : []),
    { text: `Retention: ${fmt(s.R)}.`, meaning: "Your score alone a week later minus your score alone on the first day." },
    { text: `Learning: ${fmt(s.L)}.`, meaning: "A week later, your score on questions first seen with AI minus your score on questions first seen alone." },
    { text: s.dependence === null ? DEPENDENCE.unknown : s.dependence ? DEPENDENCE.yes : DEPENDENCE.no },
    ...(r.trend ? [] : [{ text: `The trend opens at ${MIN_RETESTED_PROBES_FOR_TREND} retested probes. You have ${r.retestedProbes}.` }]),
    next,
  ];
}

export function reportSentences(rows: ReportRow[]): string[] {
  return rows.map((row) => (row.meaning ? `${row.text} ${row.meaning}` : row.text));
}
