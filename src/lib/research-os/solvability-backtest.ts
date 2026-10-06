import { MIN_BRANCH_SOLVED, REACH_QUANTILE, quantile, type NeighborData, type NeighborNode } from "./solvability-frontier";

export const CUTOFFS = [2005, 2021] as const;
export const PERMUTATIONS = 10000;
export const SEED = 20261006;
export const STRATUM_FLOOR = 10;
export const LENGTH_BANDS = ["under 20 words", "20 to 40 words", "over 40 words"] as const;
export type LengthBand = (typeof LENGTH_BANDS)[number];

export function lengthBand(words: number): LengthBand {
  if (words < 20) return LENGTH_BANDS[0];
  if (words <= 40) return LENGTH_BANDS[1];
  return LENGTH_BANDS[2];
}

export const CODINGS = ["settled", "advanced"] as const;
export type Coding = (typeof CODINGS)[number];
export const CODING_LABEL: Record<Coding, string> = { settled: "settled: solved only", advanced: "settled or advanced: solved or partial" };
export const CODING_STATUSES: Record<Coding, readonly string[]> = { settled: ["solved"], advanced: ["solved", "partial"] };

export interface BacktestRow {
  id: string;
  title: string;
  branch: string;
  posed: number;
  words: number;
  reach: number;
  reachBounded: boolean;
  inside: boolean;
  decided: boolean;
  sampled: boolean;
  undatedSolved: boolean;
  settled: boolean;
  advanced: boolean;
  status: string;
}

export interface Stratum {
  name: string;
  inside: number;
  outside: number;
  resolvedInside: number;
  resolvedOutside: number;
  rateInside: number | null;
  rateOutside: number | null;
  ratio: number | null;
  pValue: number | null;
  belowFloor: boolean;
}

export interface Bound {
  name: string;
  inside: number;
  outside: number;
  rateInside: number | null;
  rateOutside: number | null;
  ratio: number | null;
}

export interface CodingResult {
  coding: Coding;
  label: string;
  all: Stratum;
  byLength: Stratum[];
  byBranch: Stratum[];
  auc: number | null;
  aucRows: number;
  undatedRemoved: { all: Stratum; auc: number | null; aucRows: number };
  undecidedResolved: number;
  undecidedBounds: Bound[];
}

export interface CutoffBacktest {
  cutoff: number;
  solvedAtCutoff: number;
  threshold: number;
  thresholdBounded: number;
  tested: number;
  unsampled: number;
  reachBounded: number;
  undecided: number;
  undatedSolved: number;
  undatedSolvedTested: number;
  codings: CodingResult[];
  rows: BacktestRow[];
}

export interface Backtest {
  schema: "bucket.solvability-backtest/v2";
  permutations: number;
  seed: number;
  floor: number;
  neighbourBound: number;
  rule: string;
  leakage: string;
  cutoffs: CutoffBacktest[];
}

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;
const round4 = (x: number) => Math.round(x * 10000) / 10000;

export function permutationP(inside: readonly boolean[], outside: readonly boolean[], permutations: number, seed: number): number {
  const count = (xs: readonly boolean[]) => xs.filter(Boolean).length;
  const observed = Math.abs(count(inside) / inside.length - count(outside) / outside.length);
  const pool = [...inside, ...outside];
  const random = seededRandom(seed);
  let hits = 0;
  for (let k = 0; k < permutations; k++) {
    shuffleInPlace(pool, random);
    let a = 0;
    for (let i = 0; i < inside.length; i++) if (pool[i]) a++;
    const b = count(pool) - a;
    const diff = Math.abs(a / inside.length - b / outside.length);
    if (diff >= observed - 1e-12) hits++;
  }
  return (hits + 1) / (permutations + 1);
}

export function auc(scores: readonly number[], outcomes: readonly boolean[]): number | null {
  const pos = scores.filter((_, i) => outcomes[i]);
  const neg = scores.filter((_, i) => !outcomes[i]);
  if (pos.length === 0 || neg.length === 0) return null;
  let sum = 0;
  for (const p of pos) for (const n of neg) sum += p > n ? 1 : p === n ? 0.5 : 0;
  return sum / (pos.length * neg.length);
}

export function stratum(name: string, rows: readonly BacktestRow[], permutations: number, seed: number, floor = STRATUM_FLOOR, coding: Coding = "advanced"): Stratum {
  const ins = rows.filter((r) => r.inside);
  const outs = rows.filter((r) => !r.inside);
  const resolvedInside = ins.filter((r) => r[coding]).length;
  const resolvedOutside = outs.filter((r) => r[coding]).length;
  const belowFloor = ins.length < floor || outs.length < floor;
  if (belowFloor) return { name, inside: ins.length, outside: outs.length, resolvedInside, resolvedOutside, rateInside: null, rateOutside: null, ratio: null, pValue: null, belowFloor };
  const rateInside = resolvedInside / ins.length;
  const rateOutside = resolvedOutside / outs.length;
  return {
    name,
    inside: ins.length,
    outside: outs.length,
    resolvedInside,
    resolvedOutside,
    rateInside: round3(rateInside),
    rateOutside: round3(rateOutside),
    ratio: rateOutside === 0 ? null : round3(rateInside / rateOutside),
    pValue: round4(permutationP(ins.map((r) => r[coding]), outs.map((r) => r[coding]), permutations, seed)),
    belowFloor,
  };
}

interface Options {
  permutations?: number;
  seed?: number;
  minBranchSolved?: number;
  floor?: number;
}

function reachAgainst(node: NeighborNode, ids: readonly string[], solved: ReadonlySet<string>): { reach: number; bounded: boolean } {
  let best = -1;
  node.n.forEach((j, i) => {
    const id = ids[j];
    if (id !== node.id && solved.has(id) && node.s[i] > best) best = node.s[i];
  });
  const stored = node.solved_nearest;
  if (stored && stored.id !== node.id && solved.has(stored.id) && stored.sim > best) best = stored.sim;
  if (best >= 0) return { reach: best, bounded: false };
  return { reach: node.s[node.s.length - 1] ?? 0, bounded: true };
}

export function backtestCutoff(data: NeighborData, cutoff: number, opts: Options = {}): CutoffBacktest {
  const permutations = opts.permutations ?? PERMUTATIONS;
  const seed = opts.seed ?? SEED;
  const minBranchSolved = opts.minBranchSolved ?? MIN_BRANCH_SOLVED;
  const nodes = data.nodes.filter((n) => n.kind !== "lean");
  const solved = new Set(nodes.filter((n) => n.solved && n.resolved !== null && n.resolved <= cutoff).map((n) => n.id));
  if (solved.size < 2) throw new Error(`cutoff ${cutoff} leaves fewer than two solved problems`);
  const solvedReach = nodes.filter((n) => solved.has(n.id)).map((n) => reachAgainst(n, data.ids, solved));
  const decidedSolved = solvedReach.filter((r) => !r.bounded).map((r) => r.reach);
  if (decidedSolved.length < 2) throw new Error(`cutoff ${cutoff} leaves fewer than two solved problems with a solved neighbour`);
  const threshold = quantile(decidedSolved.sort((a, b) => a - b), REACH_QUANTILE);
  const solvedInBranch = new Map<string, number>();
  for (const n of nodes) if (solved.has(n.id)) solvedInBranch.set(n.branch, (solvedInBranch.get(n.branch) ?? 0) + 1);
  const rows: BacktestRow[] = nodes
    .filter((n) => n.posed != null && n.posed <= cutoff && !solved.has(n.id))
    .map((n) => {
      const r = reachAgainst(n, data.ids, solved);
      return {
        id: n.id,
        title: n.title,
        branch: n.branch,
        posed: n.posed!,
        words: n.words ?? n.title.split(/\s+/).length,
        reach: r.reach,
        reachBounded: r.bounded,
        inside: !r.bounded && r.reach >= threshold,
        decided: !r.bounded || r.reach < threshold,
        sampled: (solvedInBranch.get(n.branch) ?? 0) >= minBranchSolved,
        undatedSolved: n.solved && n.resolved === null,
        settled: CODING_STATUSES.settled.includes(n.status),
        advanced: CODING_STATUSES.advanced.includes(n.status),
        status: n.status,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const sampled = rows.filter((r) => r.sampled && r.decided);
  const undecided = rows.filter((r) => r.sampled && !r.decided);
  const dated = sampled.filter((r) => !r.undatedSolved);
  const rate = (xs: readonly BacktestRow[], coding: Coding) => (xs.length ? xs.filter((r) => r[coding]).length / xs.length : null);
  const bound = (name: string, ins: readonly BacktestRow[], outs: readonly BacktestRow[], coding: Coding): Bound => {
    const ri = rate(ins, coding);
    const ro = rate(outs, coding);
    return { name, inside: ins.length, outside: outs.length, rateInside: ri === null ? null : round3(ri), rateOutside: ro === null ? null : round3(ro), ratio: ri === null || !ro ? null : round3(ri / ro) };
  };
  const codings = CODINGS.map((coding): CodingResult => {
    const aucValue = auc(sampled.map((r) => r.reach), sampled.map((r) => r[coding]));
    const aucDated = auc(dated.map((r) => r.reach), dated.map((r) => r[coding]));
    const ins = sampled.filter((r) => r.inside);
    const outs = sampled.filter((r) => !r.inside);
    return {
      coding,
      label: CODING_LABEL[coding],
      all: stratum("all", sampled, permutations, seed, opts.floor, coding),
      byLength: LENGTH_BANDS.map((band) => stratum(band, sampled.filter((r) => lengthBand(r.words) === band), permutations, seed, opts.floor, coding)),
      byBranch: Array.from(new Set(sampled.map((r) => r.branch)))
        .sort()
        .map((b) => stratum(b, sampled.filter((r) => r.branch === b), permutations, seed, opts.floor, coding)),
      auc: aucValue === null ? null : round3(aucValue),
      aucRows: sampled.length,
      undatedRemoved: { all: stratum("all, undated solved rows removed", dated, permutations, seed, opts.floor, coding), auc: aucDated === null ? null : round3(aucDated), aucRows: dated.length },
      undecidedResolved: undecided.filter((r) => r[coding]).length,
      undecidedBounds: [bound("all undecided inside", [...ins, ...undecided], outs, coding), bound("all undecided outside", ins, [...outs, ...undecided], coding)],
    };
  });
  return {
    cutoff,
    solvedAtCutoff: solved.size,
    threshold: round3(threshold),
    thresholdBounded: solvedReach.filter((r) => r.bounded).length,
    tested: rows.length,
    unsampled: rows.filter((r) => !r.sampled).length,
    reachBounded: rows.filter((r) => r.sampled && r.reachBounded).length,
    undecided: undecided.length,
    undatedSolved: sampled.filter((r) => r.undatedSolved).length,
    undatedSolvedTested: rows.filter((r) => r.undatedSolved).length,
    codings,
    rows,
  };
}

export function backtest(data: NeighborData, cutoffs: readonly number[] = CUTOFFS, opts: Options = {}): Backtest {
  return {
    schema: "bucket.solvability-backtest/v2",
    permutations: opts.permutations ?? PERMUTATIONS,
    seed: opts.seed ?? SEED,
    floor: opts.floor ?? STRATUM_FLOOR,
    neighbourBound: data.k,
    rule: `For a cutoff year the solved set is every row solved under the atlas rule with a resolved year at or before the cutoff. Every row posed at or before the cutoff and outside that set is tested. Its reach is its highest similarity to a cutoff-solved row among its ${data.k} stored neighbours and its stored nearest solved row; when none of those was solved by the cutoff the reach is unknown and bounded above by the ${data.k}th neighbour's similarity. The threshold is the ${Math.round(REACH_QUANTILE * 100)}th percentile of reach among the cutoff-solved rows that have a cutoff-solved neighbour; the rest are counted and dropped, which can only raise the threshold. A tested row is inside when its reach is at or above the threshold, outside when its reach or its bound falls below it, and undecided when its reach is unknown and its bound is at or above the threshold; undecided rows are counted and left out of the rates. The outcome is the row's 2026 status under two codings reported side by side: settled counts solved only; settled or advanced counts solved or partial. Partial is assigned in 2026 by the ingest from the status source, so the two codings bound what the row's history supports. A solved row with no resolved year posed by the cutoff is tested and scored as resolved under both codings; the tables repeat the all-rows result with those rows removed. Undecided rows are also scored under the two extremes, all of them inside and all of them outside, as a bound without a p-value. Rows whose branch holds fewer than ${opts.minBranchSolved ?? MIN_BRANCH_SOLVED} cutoff-solved rows are unsampled and left out of the rates. A stratum with fewer than ${opts.floor ?? STRATUM_FLOOR} rows on either side reports counts only. The p-value is two-sided: the share of ${opts.permutations ?? PERMUTATIONS} seeded shuffles of the outcomes whose absolute rate difference is at least the observed one, with one added to numerator and denominator. The AUC is the Mann-Whitney probability that a resolved row's reach exceeds an unresolved row's, ties counting one half.`,
    leakage: `The embeddings and the ${data.k} stored neighbours come from the 2026 corpus, so statements written after a cutoff shape the geometry a cutoff is scored on. The test checks the rule against known outcomes under that leak, which is a weaker claim than a forecast. A clean version needs embeddings fitted on text dated at or before the cutoff and a neighbour set frozen per cutoff.`,
    cutoffs: cutoffs.map((c) => backtestCutoff(data, c, opts)),
  };
}
