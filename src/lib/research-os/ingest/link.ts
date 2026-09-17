/**
 * Canon to mastery: link a claim, paper, or figure to the Academy atoms it
 * rests on by the words they share. A small IDF-weighted overlap over
 * titles and summaries, with stopwords out and a floor on shared
 * informative words, so a link means the two texts name the same things.
 * Pure; the importer decides what to do with a link.
 */
const STOP = new Set(
  "a an the and or of to in on for with by from as at is are was were be been being this that these those it its into over under than then so such not no nor but if which who whom whose what when where why how all any each few more most other some own same very can will just also about between through during before after above below up down out off again further once here there claim law".split(" ")
);

export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((t) => t.replace(/^(\d+)$/, ""))
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map((t) => (t.endsWith("ies") ? t.slice(0, -3) + "y" : t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
}

export interface LinkTarget {
  id: string;
  text: string;
  branch?: string;
}
export interface LinkHit {
  id: string;
  score: number;
  shared: string[];
}

export class Linker {
  private docs: Map<string, { terms: Set<string>; branch?: string }> = new Map();
  private df = new Map<string, number>();
  private n = 0;

  constructor(targets: LinkTarget[]) {
    targets.forEach((t) => {
      const set = new Set(terms(t.text));
      this.docs.set(t.id, { terms: set, branch: t.branch });
      set.forEach((w) => this.df.set(w, (this.df.get(w) ?? 0) + 1));
      this.n++;
    });
  }

  idf(w: string): number {
    const d = this.df.get(w) ?? 0;
    return Math.log((this.n + 1) / (d + 1)) + 1;
  }

  /** The best targets for a text: IDF-weighted shared terms over the query's weight, at least `minShared` informative words in common. */
  link(text: string, opts: { branch?: string; topK?: number; minScore?: number; minShared?: number } = {}): LinkHit[] {
    const q = new Set(terms(text));
    if (q.size === 0) return [];
    let qw = 0;
    q.forEach((w) => (qw += this.idf(w)));
    const hits: LinkHit[] = [];
    this.docs.forEach((d, id) => {
      if (opts.branch && d.branch && d.branch !== opts.branch) return;
      const shared: string[] = [];
      let sw = 0;
      q.forEach((w) => {
        if (d.terms.has(w)) {
          shared.push(w);
          sw += this.idf(w);
        }
      });
      if (shared.length < (opts.minShared ?? 2)) return;
      const score = sw / Math.sqrt(qw * Math.max(1, Array.from(d.terms).reduce((a, w) => a + this.idf(w), 0)));
      if (score >= (opts.minScore ?? 0.12)) hits.push({ id, score: +score.toFixed(4), shared });
    });
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, opts.topK ?? 3);
  }
}
