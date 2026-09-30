export const REFERENCE_SCHEMA = "bucket.reference-basis/1";

export interface ReferenceComponent {
  index: number;
  angle_deg: number;
  variance_ratio: number;
  label: string;
  top_terms: string[];
  bottom_terms: string[];
}

export interface ReferenceBasis {
  schema: typeof REFERENCE_SCHEMA;
  sign_convention: string;
  stop_words?: string[];
  vocab: string[];
  idf: number[];
  loadings: number[][];
  offset: number[];
  score_mean: number[];
  score_std: number[];
  components: ReferenceComponent[];
}

export interface Projection {
  scores: number[];
  coverage: number;
}

const TOKEN_SOURCE = "(?<![\\p{L}\\p{N}_])\\p{L}[\\p{L}\\p{N}_]+";

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(new RegExp(TOKEN_SOURCE, "gu")) ?? [];
}

export function parseReferenceBasis(raw: unknown): ReferenceBasis {
  const b = raw as ReferenceBasis;
  if (!b || b.schema !== REFERENCE_SCHEMA) throw new Error(`expected a ${REFERENCE_SCHEMA} file`);
  const k = b.loadings.length;
  const v = b.vocab.length;
  if (b.idf.length !== v || b.loadings.some((r) => r.length !== v) || b.offset.length !== k || b.score_mean.length !== k || b.score_std.length !== k) throw new Error("the reference basis has inconsistent sizes");
  return b;
}

export function projectText(basis: ReferenceBasis, text: string): Projection {
  const index = new Map(basis.vocab.map((t, i) => [t, i]));
  const stop = new Set(basis.stop_words ?? []);
  const tokens = tokenize(text).filter((t) => !stop.has(t));
  const seen = new Set<number>();
  let hits = 0;
  for (const t of tokens) {
    const i = index.get(t);
    if (i !== undefined) {
      seen.add(i);
      hits++;
    }
  }
  let norm = 0;
  seen.forEach((i) => {
    norm += basis.idf[i] ** 2;
  });
  norm = Math.sqrt(norm) || 1;
  const scores = basis.loadings.map((row, c) => {
    let raw = 0;
    seen.forEach((i) => {
      raw += (basis.idf[i] / norm) * row[i];
    });
    return (raw - basis.offset[c] - basis.score_mean[c]) / basis.score_std[c];
  });
  return { scores, coverage: tokens.length ? hits / tokens.length : 0 };
}

export const LOW_COVERAGE = 0.3;

let loaded: Promise<ReferenceBasis> | null = null;

export function loadReferenceBasis(): Promise<ReferenceBasis> {
  if (!loaded) loaded = import("@/data/explore/reference-basis.json").then((m) => parseReferenceBasis(m.default));
  return loaded;
}
