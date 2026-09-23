import { idfOf, lexicalScore } from "./decompose-further";
import { isIdeaNode } from "./idea";
import type { MakeupNode, Snapshot } from "./makeup";
import { attend, primeBasis, queryVectorOf, type PrimeBasis } from "./prime-algebra";
import { FACTOR_EDGES, type Decomposition } from "./primes";

export const MAX_IDS = 8;
export const MAX_PHRASE = 200;
export const MAX_K = 50;
export const DEFAULT_K = 20;
export const PHRASE_ENTRIES = 3;
export const LEXICAL_FLOOR = 0.1;
export const TAU = 0.1;

export type AttentionIndex = {
  basis: PrimeBasis;
  ideas: MakeupNode[];
  idf: Map<string, number>;
  text: Map<string, string>;
};

const indexes = new WeakMap<Snapshot, AttentionIndex>();

export function attentionIndex(snap: Snapshot): AttentionIndex {
  const hit = indexes.get(snap);
  if (hit) return hit;
  const ideas = Array.from(snap.byId.values())
    .filter((n) => isIdeaNode({ kind: n.kind ?? "", provenanceType: n.provenanceType ?? null }) && snap.dec.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const text = new Map(ideas.map((n) => [n.id, `${n.title} ${snap.summaries.get(n.id) ?? ""}`.trim()]));
  const idf = idfOf(ideas.map((n) => ({ title: n.title, summary: snap.summaries.get(n.id) ?? null })));
  const index = { basis: primeBasis(snap.dec), ideas, idf, text };
  indexes.set(snap, index);
  return index;
}

export function coneOf(dec: Map<string, Decomposition>, ids: Iterable<string>, down = true): Set<string> {
  const seeds = new Set(ids);
  const out = new Set<string>();
  const walk = (start: string, next: (d: Decomposition) => string[]) => {
    const stack = [start];
    while (stack.length) {
      const d = dec.get(stack.pop()!);
      if (!d) continue;
      for (const n of next(d)) {
        if (out.has(n) || seeds.has(n)) continue;
        out.add(n);
        stack.push(n);
      }
    }
  };
  for (const id of Array.from(seeds)) {
    walk(id, (d) => d.factors.map((f) => f.id));
    if (down) walk(id, (d) => d.dependents);
  }
  return out;
}

export type Entry = { id: string; score: number };

export function phraseEntries(
  phrase: string,
  index: AttentionIndex,
  opts: { entries?: number; floor?: number; exclude?: ReadonlySet<string> } = {},
): Entry[] {
  const entries = opts.entries ?? PHRASE_ENTRIES;
  const floor = opts.floor ?? LEXICAL_FLOOR;
  return index.ideas
    .filter((n) => !opts.exclude?.has(n.id))
    .map((n) => ({ id: n.id, score: lexicalScore(phrase, index.text.get(n.id) ?? n.title, index.idf) }))
    .filter((e) => e.score >= floor)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, entries);
}

export type EdgeRow = { from_id: string; to_id: string; kind: string };

export function publicFactorIds(nodeId: string, edges: EdgeRow[], snap: Snapshot): string[] {
  const out = new Set<string>();
  const isIdea = (id: string) => snap.dec.has(id);
  for (const e of edges) {
    const side = FACTOR_EDGES[e.kind];
    if (!side) continue;
    const node = side === "from" ? e.to_id : e.from_id;
    const factor = side === "from" ? e.from_id : e.to_id;
    if (node !== nodeId || factor === nodeId || !snap.byId.has(factor)) continue;
    if (isIdea(factor)) out.add(factor);
    else for (const f of Array.from(snap.factors.get(factor)?.keys() ?? [])) if (isIdea(f)) out.add(f);
  }
  return Array.from(out).sort();
}

export type AttendHit = MakeupNode & {
  score: number;
  weight: number;
  terms: (MakeupNode & { term: number })[];
};

export type AttendQuery = {
  ids?: string[];
  entries?: Entry[];
  privateFactors?: string[][];
  k?: number;
  cone?: "hide" | "show";
};

export type AttendResult = { hits: AttendHit[]; masked: number; queryPrimes: number };

export function rankByAttention(snap: Snapshot, query: AttendQuery): AttendResult {
  const index = attentionIndex(snap);
  const k = Math.min(MAX_K, Math.max(1, query.k ?? DEFAULT_K));
  const seeds = (query.ids ?? []).concat((query.entries ?? []).map((e) => e.id)).filter((id) => snap.dec.has(id));
  const privates = (query.privateFactors ?? []).flat().filter((id) => snap.dec.has(id));
  const weighted = [
    ...(query.ids ?? []).map((id) => ({ id })),
    ...(query.entries ?? []).map((e) => ({ id: e.id, weight: e.score })),
    ...(query.privateFactors ?? []).flatMap((fs) => fs.map((id) => ({ id }))),
  ].filter((x) => snap.dec.has(x.id));
  const q = queryVectorOf(index.basis, weighted);
  const empty = { hits: [], masked: 0, queryPrimes: q.size };
  if (!q.size) return empty;
  const cone = coneOf(snap.dec, seeds);
  for (const id of Array.from(coneOf(snap.dec, privates, false)).concat(privates)) cone.add(id);
  const mask = query.cone === "show" ? new Set<string>() : cone;
  const all = { k: Number.MAX_SAFE_INTEGER, tau: TAU, basis: index.basis, queryVector: q };
  const shown = attend(snap.dec, seeds, { ...all, mask });
  const unmasked = attend(snap.dec, seeds, all).length;
  const node = (id: string): MakeupNode => snap.byId.get(id) ?? { id, slug: id, title: id, branch: "" };
  const hits = shown.slice(0, k).map((a) => ({
    ...node(a.id),
    score: a.score,
    weight: a.weight,
    terms: a.terms.map((t) => ({ ...node(t.prime), term: t.term })),
  }));
  return { hits, masked: unmasked - shown.length, queryPrimes: q.size };
}

export type PrivateLookup = { factors: string[][]; denied: number; missing: number };

export type AttendDeps = {
  snapshot: () => Promise<Snapshot>;
  privateFactors: (slugs: string[], snap: Snapshot, learnerId: string | null) => Promise<PrivateLookup>;
};

export type AttendParams = { ids: string[]; q: string; k: number; cone: "hide" | "show" };

export type AttendError = { error: string; status: 400 | 404 | 503 };

export function parseAttendParams(sp: URLSearchParams): AttendParams | AttendError {
  const ids = Array.from(new Set((sp.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean)));
  const q = (sp.get("q") ?? "").trim();
  if (!ids.length && !q) return { error: "ids or q is required", status: 400 };
  if (ids.length > MAX_IDS) return { error: `at most ${MAX_IDS} ids`, status: 400 };
  if (q.length > MAX_PHRASE) return { error: `q is at most ${MAX_PHRASE} characters`, status: 400 };
  const kRaw = sp.get("k");
  const k = kRaw === null ? DEFAULT_K : Number(kRaw);
  if (!Number.isInteger(k) || k < 1 || k > MAX_K) return { error: `k runs from 1 to ${MAX_K}`, status: 400 };
  const cone = sp.get("cone") ?? "hide";
  if (cone !== "hide" && cone !== "show") return { error: "cone is hide or show", status: 400 };
  return { ids, q, k, cone };
}

export type AttendResponse = AttendResult & {
  query: MakeupNode[];
  entries: (MakeupNode & { score: number })[];
  entry: "lexical" | null;
  denied: number;
  missing: number;
};

export async function answerAttend(params: AttendParams, learnerId: string | null, deps: AttendDeps): Promise<AttendResponse | AttendError> {
  let snap: Snapshot;
  try {
    snap = await deps.snapshot();
  } catch {
    return { error: "graph_read_failed", status: 503 };
  }
  const publicIds = params.ids.map((s) => snap.bySlug.get(s)?.id).filter((id): id is string => !!id && snap.dec.has(id));
  const unknown = params.ids.filter((s) => !snap.bySlug.has(s));
  let priv: PrivateLookup = { factors: [], denied: 0, missing: 0 };
  if (unknown.length) {
    try {
      priv = await deps.privateFactors(unknown, snap, learnerId);
    } catch {
      return { error: "access_unavailable", status: 503 };
    }
  }
  const index = attentionIndex(snap);
  const entries = params.q ? phraseEntries(params.q, index) : [];
  if (!publicIds.length && !entries.length && !priv.factors.some((f) => f.length)) return { error: "no query node resolved", status: 404 };
  const result = rankByAttention(snap, { ids: publicIds, entries, privateFactors: priv.factors, k: params.k, cone: params.cone });
  return {
    ...result,
    query: publicIds.map((id) => snap.byId.get(id)!),
    entries: entries.map((e) => ({ ...snap.byId.get(e.id)!, score: e.score })),
    entry: params.q ? "lexical" : null,
    denied: priv.denied,
    missing: priv.missing,
  };
}
