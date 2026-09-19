/**
 * Wikipedia link evidence for a proposed factor: a reference-distance score
 * after RefD (Liang, Wu, Huang, and Giles 2015, "Measuring Prerequisite
 * Relations Among Concepts", EMNLP, https://doi.org/10.18653/v1/d15-1193).
 * It is the decompose-further queue's judge outside the Claude models
 * (learning/research-os/PRIMES.md).
 *
 * RefD says B is a prerequisite of A when the articles A links to refer to
 * B more than the articles B links to refer to A. For a factor F of a
 * target T:
 *
 *   refd(F, T) = mean over x in L(T) of r(x, F)  -  mean over y in L(F) of r(y, T)
 *
 * where L(a) is the set of articles a links to and r(x, a) is 1 when x is a
 * or links to it. Positive means T's neighbourhood leans on F more than F's
 * leans on T, which reads as F before T.
 *
 * This is a restricted variant: r(x, a) needs x's own links, and only the
 * articles the graph maps to have been fetched, so the means run over the
 * linked articles inside that set (scripts/research-os/wikipedia-links.ts).
 * A pair gets null when neither article links to a fetched one, and 0 when
 * they do but neither side refers to the other.
 */
import { seeded } from "./decompose-further";

/** The article title in a Wikipedia URL, each "_" read as a space. */
export function wikiTitleFromUrl(url: string): string | null {
  const m = /^https?:\/\/en\.(?:m\.)?wikipedia\.org\/wiki\/([^#?]+)/.exec(url.trim());
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).replace(/_/g, " ").trim() || null;
  } catch {
    return null;
  }
}

/** Link sets keyed by canonical article title. */
export type LinkIndex = Map<string, Set<string>>;

function refers(links: LinkIndex, x: string, a: string): boolean {
  return x === a || (links.get(x)?.has(a) ?? false);
}

/** refd(F, T) over the fetched articles, or null when either side has no fetched neighbour. */
export function refd(factor: string, target: string, links: LinkIndex): number | null {
  const lf = links.get(factor);
  const lt = links.get(target);
  if (!lf || !lt || factor === target) return null;
  const nearT = Array.from(lt).filter((x) => links.has(x) || x === factor);
  const nearF = Array.from(lf).filter((y) => links.has(y) || y === target);
  if (!nearT.length && !nearF.length) return null;
  const a = nearT.length ? nearT.filter((x) => refers(links, x, factor)).length / nearT.length : 0;
  const b = nearF.length ? nearF.filter((y) => refers(links, y, target)).length / nearF.length : 0;
  return Math.round((a - b) * 1000) / 1000;
}

type SignCounts = { positive: number; zero: number; negative: number; mean: number | null };
export type RefdAgreement = {
  /** Scored pairs the verifier confirmed or refuted. */
  pairs: number;
  confirmed: SignCounts;
  refuted: SignCounts;
  /**
   * Chance that a confirmed pair scores above a refuted one, ties counted
   * half (the Mann-Whitney form of the ROC area). 0.5 means the link
   * evidence cannot tell the verifier's two verdicts apart.
   */
  auc: number | null;
};

function counts(xs: number[]): SignCounts {
  return {
    positive: xs.filter((x) => x > 0).length,
    zero: xs.filter((x) => x === 0).length,
    negative: xs.filter((x) => x < 0).length,
    mean: xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 1000 : null,
  };
}

function aucOf(yes: number[], no: number[]): number | null {
  if (!yes.length || !no.length) return null;
  let wins = 0;
  for (const a of yes) for (const b of no) wins += a > b ? 1 : a === b ? 0.5 : 0;
  return wins / (yes.length * no.length);
}

/**
 * The ROC area with a 95% percentile interval from resampling whole targets
 * with replacement (Efron 1979), since pairs under one target share its
 * articles. Targets resample in a fixed order under a seed, so the interval
 * repeats run to run. With fewer than `minEach` confirmed or refuted pairs
 * the interval is left out, since a handful of positives makes a resampled
 * area look certain.
 */
export function refdAucInterval(
  rows: { target: string; refd: number | null; verification: string }[],
  resamples = 1000,
  seed = "refd",
  minEach = 10,
): { auc: number | null; interval: [number, number] | null; targets: number; confirmed: number; refuted: number } {
  const scored = rows.filter((r) => r.refd !== null && (r.verification === "confirmed" || r.verification === "refuted"));
  const byTarget = new Map<string, typeof scored>();
  for (const r of scored) {
    if (!byTarget.has(r.target)) byTarget.set(r.target, []);
    byTarget.get(r.target)!.push(r);
  }
  const groups = Array.from(byTarget.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, g]) => g);
  const split = (rs: typeof scored) => [
    rs.filter((r) => r.verification === "confirmed").map((r) => r.refd!),
    rs.filter((r) => r.verification === "refuted").map((r) => r.refd!),
  ];
  const [yes, no] = split(scored);
  const point = aucOf(yes, no);
  let interval: [number, number] | null = null;
  if (point !== null && groups.length >= 2 && yes.length >= minEach && no.length >= minEach) {
    const rand = seeded(seed);
    const xs: number[] = [];
    for (let i = 0; i < resamples; i++) {
      const sample: typeof scored = [];
      for (let j = 0; j < groups.length; j++) sample.push(...groups[Math.floor(rand() * groups.length)]);
      const [y, n] = split(sample);
      const a = aucOf(y, n);
      if (a !== null) xs.push(a);
    }
    xs.sort((a, b) => a - b);
    if (xs.length) interval = [round3(xs[Math.floor(0.025 * (xs.length - 1))]), round3(xs[Math.ceil(0.975 * (xs.length - 1))])];
  }
  return { auc: point === null ? null : round3(point), interval, targets: groups.length, confirmed: yes.length, refuted: no.length };
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** How the link evidence lines up with the second model's verdicts. */
export function refdAgreement(rows: { refd: number | null; verification: string }[]): RefdAgreement {
  const yes = rows.filter((r) => r.refd !== null && r.verification === "confirmed").map((r) => r.refd!);
  const no = rows.filter((r) => r.refd !== null && r.verification === "refuted").map((r) => r.refd!);
  const a = aucOf(yes, no);
  return { pairs: yes.length + no.length, confirmed: counts(yes), refuted: counts(no), auc: a === null ? null : round3(a) };
}

/** The parts of a MediaWiki `action=query` reply (formatversion=2) that title resolution reads. */
export type WikiQuery = {
  normalized?: { from: string; to: string }[];
  redirects?: { from: string; to: string }[];
  pages?: { title: string; missing?: boolean; invalid?: boolean; pageprops?: Record<string, unknown> }[];
};

/**
 * Each asked title's canonical article: case and spacing normalised, then
 * redirects followed. Missing pages and disambiguation pages resolve to
 * null, since neither names one concept.
 */
export function resolveTitles(asked: string[], q: WikiQuery): Map<string, string | null> {
  const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
  const redirect = new Map((q.redirects ?? []).map((r) => [r.from, r.to]));
  const page = new Map((q.pages ?? []).map((p) => [p.title, p]));
  const out = new Map<string, string | null>();
  for (const a of asked) {
    let t = norm.get(a) ?? a;
    for (let hops = 0; redirect.has(t) && hops < 5; hops++) t = redirect.get(t)!;
    const p = page.get(t);
    const ok = p && !p.missing && !p.invalid && !(p.pageprops && "disambiguation" in p.pageprops);
    out.set(a, ok ? t : null);
  }
  return out;
}

/**
 * Link sets over the known articles: each article's raw links mapped
 * through the alias table (redirect title to canonical title) and kept
 * when they land on a known article other than itself.
 */
export function knownLinks(raw: Map<string, string[]>, aliasOf: Map<string, string>): LinkIndex {
  const known = new Set(raw.keys());
  const out: LinkIndex = new Map();
  for (const [title, links] of Array.from(raw)) {
    const set = new Set<string>();
    for (const l of links) {
      const c = aliasOf.get(l) ?? l;
      if (c !== title && known.has(c)) set.add(c);
    }
    out.set(title, set);
  }
  return out;
}

/** RefD for each factor pair whose two ends both map to a fetched article. */
export function scorePairs<T extends { from_slug: string; to_slug: string }>(
  rows: T[],
  titleOf: Map<string, string>,
  links: LinkIndex,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const f = titleOf.get(r.from_slug);
    const t = titleOf.get(r.to_slug);
    if (!f || !t) continue;
    const s = refd(f, t, links);
    if (s !== null) out.set(`${r.from_slug}->${r.to_slug}`, s);
  }
  return out;
}
