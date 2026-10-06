import type { Backtest, Bound, CodingResult, CutoffBacktest, Stratum } from "./solvability-backtest";
import type { Predictions, ReachClass } from "./solvability-predictions";
import type { BranchCount, Zone } from "./solvability-frontier";

export interface ReportData {
  schema: string;
  built: string;
  nodes: number;
  model: string;
  revision: string;
  k: number;
  frontier: { threshold: number; rule: string; counts: Record<Zone, number>; inside: number; outside: number; branches: Record<string, BranchCount>; gaps: string };
  backtest: Omit<Backtest, "cutoffs"> & { cutoffs: Omit<CutoffBacktest, "rows">[] };
  predictions: Omit<Predictions, "rows"> & { top: Record<ReachClass, Predictions["rows"]>; atlas: Predictions["rows"] };
}

export const EMPIRICAL_COMMAND = "npx ts-node scripts/build-solvability-frontier-report.ts";

export function empirical(data: ReportData, file = "output/solvability-frontier/report/backtest.json"): string {
  return `[empirical: ${file}, ${data.built}, ${EMPIRICAL_COMMAND}]`;
}

export const n = (x: number): string => x.toLocaleString("en-US");
export const pct = (x: number | null): string => (x === null ? "n/a" : `${Math.round(x * 100)}%`);
export const f3 = (x: number | null): string => (x === null ? "n/a" : x.toFixed(3));

export function tagSentences(text: string, tag: string): string {
  return text
    .split(/(?<=[.;])\s+/)
    .map((part) => (/\d/.test(part) && !TAG.test(part) ? part.replace(/([.;])$/, ` ${tag}$1`) : part))
    .join(" ");
}

const TAG = /\[(bm|bm-open):[A-Za-z0-9_.']+\]|\[empirical:[^\]]+\]/;

export function rateSentence(s: Stratum, floor: number, tag = ""): string {
  const end = tag ? ` ${tag}.` : ".";
  if (s.belowFloor) return `${s.name}: ${n(s.inside)} inside and ${n(s.outside)} outside, fewer than ${floor} on one side, so no rate is given${end}`;
  return `${s.name}: ${n(s.inside)} inside with a resolved rate of ${pct(s.rateInside)}, ${n(s.outside)} outside with a resolved rate of ${pct(s.rateOutside)}, ratio ${f3(s.ratio)}, permutation p ${f3(s.pValue)}${end}`;
}

export function codingSentence(k: CodingResult, tag: string): string {
  const s = k.all;
  return `${k.label}: ${n(s.inside)} inside at ${pct(s.rateInside)}, ${n(s.outside)} outside at ${pct(s.rateOutside)}, ratio ${f3(s.ratio)}, p ${f3(s.pValue)}, AUC ${f3(k.auc)} over ${n(k.aucRows)} rows ${tag}.`;
}

export function boundSentence(b: Bound): string {
  return `${b.name}: ${n(b.inside)} inside at ${pct(b.rateInside)}, ${n(b.outside)} outside at ${pct(b.rateOutside)}, ratio ${f3(b.ratio)}`;
}

export function cutoffSummary(c: Omit<CutoffBacktest, "rows">, data: ReportData): string[] {
  const e = empirical(data);
  const [settled, advanced] = c.codings;
  const scored = settled.all.inside + settled.all.outside;
  return [
    `Cutoff ${c.cutoff}: ${n(c.solvedAtCutoff)} rows were solved by then, threshold ${f3(c.threshold)} over the ${n(c.solvedAtCutoff - c.thresholdBounded)} of them with a solved neighbour in the ${data.k} stored, ${n(c.thresholdBounded)} dropped ${e}.`,
    `${n(c.tested)} rows were posed by ${c.cutoff} and open at the cutoff: ${n(c.unsampled)} unsampled, ${n(c.undecided)} undecided, ${n(scored)} scored ${e}.`,
    codingSentence(settled, e),
    codingSentence(advanced, e),
    tagSentences(`${n(c.undatedSolvedTested)} tested rows are solved today with no resolved year, ${n(c.undatedSolved)} of them scored; with those removed: settled ${pct(settled.undatedRemoved.all.rateInside)} inside against ${pct(settled.undatedRemoved.all.rateOutside)} outside over ${n(settled.undatedRemoved.aucRows)} rows, ratio ${f3(settled.undatedRemoved.all.ratio)}, p ${f3(settled.undatedRemoved.all.pValue)}, AUC ${f3(settled.undatedRemoved.auc)}; settled or advanced ${pct(advanced.undatedRemoved.all.rateInside)} against ${pct(advanced.undatedRemoved.all.rateOutside)}, ratio ${f3(advanced.undatedRemoved.all.ratio)}, p ${f3(advanced.undatedRemoved.all.pValue)}, AUC ${f3(advanced.undatedRemoved.auc)}.`, e),
    tagSentences(`The ${n(c.undecided)} undecided rows resolve at ${pct(c.undecided ? settled.undecidedResolved / c.undecided : null)} settled and ${pct(c.undecided ? advanced.undecidedResolved / c.undecided : null)} settled or advanced. Bounds, settled: ${settled.undecidedBounds.map(boundSentence).join("; ")}. Bounds, settled or advanced: ${advanced.undecidedBounds.map(boundSentence).join("; ")}.`, e),
  ];
}

export function verdict(data: ReportData): string {
  const e = empirical(data);
  const parts = data.backtest.cutoffs.map((c) => {
    const [s, a] = c.codings;
    return `at ${c.cutoff}, settled only: ${pct(s.all.rateInside)} inside against ${pct(s.all.rateOutside)} outside (${n(s.all.inside)} and ${n(s.all.outside)} rows, p ${f3(s.all.pValue)}, AUC ${f3(s.auc)}), falling to ${pct(s.undatedRemoved.all.rateInside)} against ${pct(s.undatedRemoved.all.rateOutside)} (p ${f3(s.undatedRemoved.all.pValue)}) once the ${n(c.undatedSolved)} solved rows with no resolved year are removed; settled or advanced: ${pct(a.all.rateInside)} against ${pct(a.all.rateOutside)} (p ${f3(a.all.pValue)}, AUC ${f3(a.auc)})`;
  });
  return `${tagSentences(`Two outcome codings, two readings: ${parts.join("; ")}.`, e)} Under the stricter coding the inside rows settle at a higher rate at both cutoffs, and most of that gap comes from solved rows whose resolved year is missing; adding partial reverses or erases the gap. The conclusion depends on how partial is coded, and partial is the uncertain column: the ingest assigned it in 2026 from a status page, with no rule for how much progress counts.`;
}

export function methodParagraphs(data: ReportData): string[] {
  const e = empirical(data, "output/solvability-frontier/report/frontier.json");
  const c = data.frontier.counts;
  const p = data.predictions;
  return [
    `The set holds ${n(data.nodes)} problems: the 71 atlas problems and every row of problems-sourced.tsv, Lean theorems left off ${e}. Each statement is embedded with ${data.model} at revision ${data.revision}, and the ${data.k} most similar rows are stored per problem with cosine similarity to three decimals ${e}.`,
    `Reach is a problem's highest similarity to a solved problem. The frontier sits at the 10th percentile of solved problems' reach, ${f3(data.frontier.threshold)} on this set ${e}. Zones: ${n(c.solved)} solved, ${n(c.reachable)} reachable, ${n(c.beyond)} beyond, ${n(c.unsampled)} unsampled, ${n(data.frontier.inside)} inside and ${n(data.frontier.outside)} outside ${e}.`,
    `Reach classes split the open top-level problems. Inside the frontier with reach at or above ${f3(p.upperReach)}, the 75th percentile of reach among inside open problems, is "close to known results"; inside below that is "borderline"; beyond is "needs a new idea"; a branch with fewer than 10 solved rows is "unsampled" ${e}. Counts: ${n(p.counts["close to known results"])}, ${n(p.counts.borderline)}, ${n(p.counts["needs a new idea"])} and ${n(p.counts.unsampled)} ${e}. Within a class the table ranks by growth, then reach, then id, the unique ordering of a ranking by score [bm:BucketMath.Ranking.rank_ordered].`,
    `Growth for a problem beyond the frontier is one plus the number of beyond problems among its ${data.k} stored neighbours whose similarity to it is at or above the threshold: the count that would move inside if it were solved ${e}.`,
    `${tagSentences(data.backtest.rule, empirical(data))} The ratio is the inside rate divided by the outside rate and is undefined when the outside rate is zero [bm:BucketMath.Marketing.ratio]. Seed ${data.backtest.seed}, ${n(data.backtest.permutations)} shuffles ${empirical(data)}.`,
  ];
}

export function weakParagraphs(data: ReportData): string[] {
  const e = empirical(data);
  const dated = data.backtest.cutoffs.map((c) => `${n(c.tested)} at ${c.cutoff}`).join(" and ");
  return [
    `Text similarity measures vocabulary. Two problems that share words sit close whether or not a method for one carries to the other, and a problem stated in unusual words sits far from everything. The nearest solved problem is evidence of shared language, and the reader has to judge whether it is evidence of a shared method.`,
    `Mathematics dominates the set: ${n(data.frontier.branches.mathematics?.total ?? 0)} of ${n(data.nodes)} rows, with ${n(data.frontier.branches.mathematics?.solved ?? 0)} solved ${empirical(data, "output/solvability-frontier/report/frontier.json")}. The threshold is set by mathematics, and the other branches are read against a frontier they did little to place.`,
    `The backtest rests on two cohorts. Of the rows with a posed year, 241 come from the two Science lists of 2005 and 2021, so the tested rows (${dated}) are mostly those lists and the lists' own paraphrases, which average 19 words against 34 for the rest of the file ${e}. The length bands exist for that reason.`,
    `Partial is the swing column. ${data.backtest.cutoffs.map((c) => `At ${c.cutoff} the settled rows number ${n(c.codings[0].all.resolvedInside + c.codings[0].all.resolvedOutside)} and the settled or advanced rows ${n(c.codings[1].all.resolvedInside + c.codings[1].all.resolvedOutside)}`).join("; ")} ${e}. Partial was assigned in 2026 by the ingest from a status page with no threshold for how much progress counts, and the two codings give different answers, so neither reading stands alone.`,
    `${data.backtest.leakage}`,
    `Two exclusions are bounded rather than fixed. Solved rows with no resolved year posed by the cutoff (${data.backtest.cutoffs.map((c) => `${n(c.undatedSolved)} at ${c.cutoff}`).join(", ")}) are tested and scored as resolved, and the tables repeat the result without them ${e}. Undecided rows resolve at ${data.backtest.cutoffs.map((c) => `${pct(c.undecided ? c.codings[1].undecidedResolved / c.undecided : null)} at ${c.cutoff}`).join(" and ")} under settled or advanced, and the tables give the inside rate with all of them inside and with all of them outside ${e}.`,
    `Only ${data.k} neighbours are stored per row. At a cutoff with few solved rows most of a row's solved peers fall outside the stored ${data.k}, so its reach at the cutoff is unknown: ${data.backtest.cutoffs.map((c) => `${n(c.undecided)} rows undecided and ${n(c.thresholdBounded)} solved rows dropped at ${c.cutoff}`).join("; ")} ${e}. Dropping them can only raise the threshold.`,
    `Resolved years exist for a minority of solved rows, so the solved set at a cutoff is a fraction of the rows solved by that year: ${data.backtest.cutoffs.map((c) => `${n(c.solvedAtCutoff)} at ${c.cutoff}`).join(", ")} against ${n(data.frontier.counts.solved)} solved today ${e}.`,
    `Sources and licences: problems.tsv is MIT; formal-conjectures rows are Apache-2.0; Wikipedia lists and the DARPA and XPRIZE rows are CC BY-SA 4.0 with attribution in the data; the Science 2005 and 2021 lists, the systems-neuroscience chapter titles and the Holy Grails titles are cited as headlines under 15 words with paraphrased statements, since the bodies are under copyright. The embedding model is MIT.`,
  ];
}

export function reportMarkdown(data: ReportData): string {
  const lines: string[] = ["# Solvability frontier report", ""];
  lines.push("## Method", "", ...methodParagraphs(data).flatMap((p) => [p, ""]));
  lines.push("## Backtest", "", verdict(data), "");
  for (const c of data.backtest.cutoffs) {
    lines.push(...cutoffSummary(c, data).flatMap((p) => [p, ""]));
    for (const k of c.codings) for (const s of [...k.byLength, ...k.byBranch]) lines.push(rateSentence(s, data.backtest.floor, empirical(data)), "");
  }
  lines.push("## Where this is weak", "", ...weakParagraphs(data).flatMap((p) => [p, ""]));
  return lines.join("\n");
}
