/**
 * Server-owned keyword search and rank fusion for evidence search
 * (ros-ai-worker, learning/research-os/ai/IMPLEMENTATION.md, "API and
 * worker contracts").
 *
 * BM25 runs in this process over the corpus the worker was built from, so
 * keyword search answers when the worker is down, and one implementation
 * serves the live API and the evaluation. The eligible set is applied
 * before any document is scored: a posting for an ineligible source is
 * skipped, never scored and filtered later.
 *
 * Pinned: tokenization (NFC, lower case, letter-and-digit runs, a fixed
 * stop list), k1 = 1.2, b = 0.75, the Lucene form of IDF over the whole
 * artifact, each distinct query term counted once, and ties broken by
 * source id. Changing any of these changes LEXICAL.
 */

export const LEXICAL = "bm25-okapi/1";
export const K1 = 1.2;
export const B = 0.75;
/** Reciprocal rank fusion constant, from Cormack, Clarke and Buettcher (SIGIR 2009). */
export const RRF_K = 60;

export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "its",
  "of", "on", "or", "that", "the", "this", "to", "was", "were", "with",
]);

// Built from a string: the ES5 compile target rejects a literal with the u flag.
const TOKEN_SOURCE = "[\\p{L}\\p{M}\\p{N}]+";

export function tokenize(text: string): string[] {
  const re = new RegExp(TOKEN_SOURCE, "gu");
  const lowered = text.normalize("NFC").toLowerCase();
  const out: string[] = [];
  for (let m = re.exec(lowered); m; m = re.exec(lowered)) {
    if (!STOPWORDS.has(m[0])) out.push(m[0]);
  }
  return out;
}

export interface LexicalDoc {
  sourceId: string;
  sourceRevision: string;
  text: string;
}

export interface Ranked {
  sourceId: string;
  sourceRevision: string;
  score: number;
}

export const eligibleKey = (sourceId: string, sourceRevision: string) => `${sourceId}\u0000${sourceRevision}`;

const bySourceThenScore = (a: Ranked, b: Ranked) => b.score - a.score || (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);

export class LexicalIndex {
  private constructor(
    readonly docs: LexicalDoc[],
    private readonly lengths: number[],
    private readonly avgdl: number,
    private readonly postings: Map<string, { doc: number; tf: number }[]>,
  ) {}

  static build(docs: LexicalDoc[]): LexicalIndex {
    const lengths: number[] = [];
    const postings = new Map<string, { doc: number; tf: number }[]>();
    docs.forEach((d, i) => {
      const toks = tokenize(d.text);
      lengths.push(toks.length);
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const [t, n] of Array.from(tf.entries())) {
        const list = postings.get(t);
        if (list) list.push({ doc: i, tf: n });
        else postings.set(t, [{ doc: i, tf: n }]);
      }
    });
    const avgdl = docs.length ? lengths.reduce((a, b) => a + b, 0) / docs.length : 0;
    return new LexicalIndex(docs, lengths, avgdl, postings);
  }

  get size(): number {
    return this.docs.length;
  }

  idf(term: string): number {
    const df = this.postings.get(term)?.length ?? 0;
    return Math.log(1 + (this.docs.length - df + 0.5) / (df + 0.5));
  }

  /**
   * The top `limit` eligible documents for `query`. `scored` counts the
   * documents that received a score, all of them eligible.
   */
  search(query: string, eligible: ReadonlySet<string>, limit: number): { results: Ranked[]; scored: number } {
    const terms = Array.from(new Set(tokenize(query)));
    const scores = new Map<number, number>();
    for (const term of terms) {
      const list = this.postings.get(term);
      if (!list) continue;
      const idf = this.idf(term);
      for (const { doc, tf } of list) {
        const d = this.docs[doc];
        if (!eligible.has(eligibleKey(d.sourceId, d.sourceRevision))) continue;
        const norm = tf + K1 * (1 - B + (B * this.lengths[doc]) / (this.avgdl || 1));
        scores.set(doc, (scores.get(doc) ?? 0) + (idf * tf * (K1 + 1)) / norm);
      }
    }
    const results = Array.from(scores.entries())
      .map(([doc, score]) => ({ sourceId: this.docs[doc].sourceId, sourceRevision: this.docs[doc].sourceRevision, score }))
      .sort(bySourceThenScore)
      .slice(0, limit);
    return { results, scored: scores.size };
  }
}

export interface Fused {
  sourceId: string;
  sourceRevision: string;
  score: number;
  lexicalRank: number | null;
  denseRank: number | null;
}

/**
 * Reciprocal rank fusion of the keyword and dense rankings: each list adds
 * 1 / (RRF_K + rank) for a source it holds, ranks counted from 1. Ties go
 * to the better single rank, then the source id.
 */
export function fuse(lexical: Ranked[], dense: Ranked[], limit: number): Fused[] {
  const out = new Map<string, Fused>();
  const add = (list: Ranked[], which: "lexicalRank" | "denseRank") =>
    list.forEach((r, i) => {
      const k = eligibleKey(r.sourceId, r.sourceRevision);
      const f = out.get(k) ?? { sourceId: r.sourceId, sourceRevision: r.sourceRevision, score: 0, lexicalRank: null, denseRank: null };
      if (f[which] !== null) return;
      f[which] = i + 1;
      f.score += 1 / (RRF_K + i + 1);
      out.set(k, f);
    });
  add(lexical, "lexicalRank");
  add(dense, "denseRank");
  const best = (f: Fused) => Math.min(f.lexicalRank ?? Infinity, f.denseRank ?? Infinity);
  return Array.from(out.values())
    .sort((a, b) => b.score - a.score || best(a) - best(b) || (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0))
    .slice(0, limit);
}
