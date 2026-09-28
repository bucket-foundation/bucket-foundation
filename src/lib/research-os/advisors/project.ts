import { ENGLISH_STOP_WORDS } from "./stop-words";

export const SPACE_SCHEMA = "bucket.advisor-space/1";

export type AdvisorSpace = {
  schema: string;
  version: string;
  vocab: string[];
  idf: number[];
  components: number[][];
  mean: number[];
  sd: number[];
  k: number;
};

const MARKUP =
  /https?:\/\/\S+|www\.\S+|\]\([^)]*\)|<[^>\n]{0,400}>|\$\$[^$]{0,2000}\$\$|\$[^$\n]{0,300}[\\^_{}][^$\n]{0,300}\$|\\[a-zA-Z]+/g;

const WORD = "\\p{L}\\p{M}\\p{N}_";
const TOKEN = new RegExp(`(?<![${WORD}])[\\p{L}\\p{M}\\p{Nl}\\p{No}][${WORD}]+(?![${WORD}])`, "gu");

export function scrub(text: string): string {
  return text.replace(MARKUP, " ");
}

export function tokens(text: string): string[] {
  return (scrub(text).toLowerCase().match(TOKEN) ?? []).filter((t) => !ENGLISH_STOP_WORDS.has(t));
}

export function statementBody(text: string, stopHeading = "## References"): string {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.trim().toLowerCase() === stopHeading.toLowerCase());
  return at >= 0 ? lines.slice(0, at).join("\n") : text;
}

export type Projector = {
  index: Map<string, number>;
  space: AdvisorSpace;
};

export function projector(space: AdvisorSpace): Projector {
  if (space.schema !== SPACE_SCHEMA) throw new Error(`advisor space schema ${space.schema} is not ${SPACE_SCHEMA}`);
  const v = space.vocab.length;
  if (space.idf.length !== v || space.components.length !== space.k || space.components.some((row) => row.length !== v)) {
    throw new Error("advisor space dimensions do not agree");
  }
  if (space.mean.length !== space.k || space.sd.length !== space.k) throw new Error("advisor space mean or sd has the wrong length");
  return { index: new Map(space.vocab.map((t, i) => [t, i])), space };
}

export function termWeights(p: Projector, text: string): Map<number, number> {
  const present = new Set<number>();
  for (const t of tokens(text)) {
    const i = p.index.get(t);
    if (i !== undefined) present.add(i);
  }
  const weights = new Map<number, number>();
  let norm = 0;
  for (const i of Array.from(present)) {
    const w = p.space.idf[i];
    weights.set(i, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) weights.forEach((w, i) => weights.set(i, w / norm));
  return weights;
}

export function project(p: Projector, text: string): { raw: number[]; whitened: number[]; terms: Map<number, number> } {
  const terms = termWeights(p, text);
  const raw = p.space.components.map((row) => {
    let s = 0;
    terms.forEach((w, i) => {
      s += row[i] * w;
    });
    return s;
  });
  const whitened = raw.map((v, c) => (v - p.space.mean[c]) / p.space.sd[c]);
  return { raw, whitened, terms };
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 0 ? dot / d : 0;
}

export function sharedTopics(p: Projector, queryTerms: Map<number, number>, topics: string[], n = 5): string[] {
  const scored: { label: string; w: number }[] = [];
  for (const label of Array.from(new Set(topics))) {
    let w = 0;
    for (const t of Array.from(new Set(tokens(label)))) {
      const i = p.index.get(t);
      if (i !== undefined) w += queryTerms.get(i) ?? 0;
    }
    if (w > 0) scored.push({ label, w });
  }
  return scored.sort((a, b) => b.w - a.w).slice(0, n).map((s) => s.label);
}
