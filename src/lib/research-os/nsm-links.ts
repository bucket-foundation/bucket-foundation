export type LinkSource = "cosine" | "model" | "both" | "random";
export type LinkStatus = "proposed" | "approved" | "rejected";

export const COSINE_TOP = 3;
export const RANDOM_EVERY = 5;
export const MAX_MODEL_PICKS = 8;
export const RATIONALE_MAX = 600;

export interface LinkPrime {
  id: string;
  label: string;
  english: string[];
  sense: string | null;
}

export interface LinkNode {
  id: string;
  slug: string | null;
  title: string | null;
  summary: string | null;
  branch: string | null;
}

export interface CosineHit {
  primeId: string;
  cosine: number;
  rank: number;
}

export interface ModelPick {
  primeId: string;
  why: string;
}

export interface LinkProposal {
  node_id: string;
  prime_id: string;
  source: LinkSource;
  cosine: number | null;
  rank: number | null;
  rationale: string | null;
  model: string | null;
  prompt_hash: string | null;
}

export interface ExistingLink {
  id: string;
  node_id: string;
  prime_id: string;
  status: LinkStatus;
}

export function primeText(p: LinkPrime): string {
  return [p.label.replace(/~/g, ", ").toLowerCase(), p.english.join(", "), p.sense ?? ""].filter(Boolean).join(". ");
}

export function nodeText(n: LinkNode): string {
  return [n.title ?? n.slug ?? "", n.summary ?? ""].filter(Boolean).join(". ");
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) s += a[i] * b[i];
  return s;
}

export function topCosine(nodeVec: ArrayLike<number>, primeVecs: Map<string, ArrayLike<number>>, k = COSINE_TOP): CosineHit[] {
  return Array.from(primeVecs.entries())
    .map(([primeId, v]) => ({ primeId, cosine: dot(nodeVec, v) }))
    .sort((a, b) => b.cosine - a.cosine || a.primeId.localeCompare(b.primeId))
    .slice(0, k)
    .map((h, i) => ({ ...h, cosine: Math.round(h.cosine * 1e4) / 1e4, rank: i + 1 }));
}

export const LINK_SCHEMA = {
  type: "object",
  properties: {
    primes: {
      type: "array",
      maxItems: MAX_MODEL_PICKS,
      items: { type: "object", properties: { id: { type: "string" }, why: { type: "string" } }, required: ["id", "why"] },
    },
  },
  required: ["primes"],
};

export function buildLinkPrompt(node: LinkNode, primes: LinkPrime[]): string {
  const list = primes.map((p) => `${p.id} | ${p.label}`).join("\n");
  return [
    "The Natural Semantic Metalanguage lists 65 semantic primes, meanings every language can express. Each line below is id | prime.",
    list,
    "",
    `Idea: ${node.title ?? node.slug ?? ""}${node.branch ? ` (${node.branch})` : ""}`,
    `Summary: ${node.summary ?? "none given"}`,
    "",
    `Name the primes this idea's definition cannot be stated without, at most ${MAX_MODEL_PICKS}, each with one sentence saying where the definition uses it. Use ids from the list only. Name none rather than guess.`,
  ].join("\n");
}

export function parseLinkAnswer(text: string, allowed: Set<string>): ModelPick[] | { error: string } {
  let parsed: unknown;
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    parsed = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  } catch {
    return { error: "unparseable" };
  }
  const list = (parsed as { primes?: unknown }).primes;
  if (!Array.isArray(list)) return { error: "no_primes_array" };
  const out: ModelPick[] = [];
  for (const item of list) {
    const id = typeof (item as { id?: unknown }).id === "string" ? (item as { id: string }).id.trim() : "";
    const why = typeof (item as { why?: unknown }).why === "string" ? (item as { why: string }).why.trim() : "";
    if (!allowed.has(id) || out.some((o) => o.primeId === id)) continue;
    out.push({ primeId: id, why: why.slice(0, RATIONALE_MAX) });
    if (out.length >= MAX_MODEL_PICKS) break;
  }
  return out;
}

export function mergeProposals(
  nodeId: string,
  hits: CosineHit[],
  picks: ModelPick[],
  meta: { model: string | null; promptHash: string | null },
): LinkProposal[] {
  const byPrime = new Map<string, LinkProposal>();
  for (const h of hits) {
    byPrime.set(h.primeId, { node_id: nodeId, prime_id: h.primeId, source: "cosine", cosine: h.cosine, rank: h.rank, rationale: null, model: null, prompt_hash: null });
  }
  for (const p of picks) {
    const prior = byPrime.get(p.primeId);
    byPrime.set(p.primeId, {
      node_id: nodeId,
      prime_id: p.primeId,
      source: prior ? "both" : "model",
      cosine: prior?.cosine ?? null,
      rank: prior?.rank ?? null,
      rationale: p.why || null,
      model: meta.model,
      prompt_hash: meta.promptHash,
    });
  }
  return Array.from(byPrime.values()).sort((a, b) => a.prime_id.localeCompare(b.prime_id));
}

export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let x = h >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

export function addRandomPairs(proposals: LinkProposal[], nodeIds: string[], primeIds: string[], taken: Set<string>, seed: string, opts: { held?: number; every?: number } = {}): LinkProposal[] {
  const want = Math.floor(proposals.length / (opts.every ?? RANDOM_EVERY)) - (opts.held ?? 0);
  if (want <= 0 || nodeIds.length === 0 || primeIds.length === 0) return [];
  const used = new Set(taken);
  for (const p of proposals) used.add(`${p.node_id}|${p.prime_id}`);
  const rnd = seededRandom(seed);
  const out: LinkProposal[] = [];
  for (let tries = 0; out.length < want && tries < want * 50; tries += 1) {
    const node = nodeIds[Math.floor(rnd() * nodeIds.length)];
    const prime = primeIds[Math.floor(rnd() * primeIds.length)];
    const key = `${node}|${prime}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push({ node_id: node, prime_id: prime, source: "random", cosine: null, rank: null, rationale: null, model: null, prompt_hash: null });
  }
  return out;
}

export interface WritePlan {
  insert: LinkProposal[];
  refresh: (LinkProposal & { id: string })[];
  kept: number;
}

export function planWrites(proposals: LinkProposal[], existing: ExistingLink[]): WritePlan {
  const have = new Map(existing.map((e) => [`${e.node_id}|${e.prime_id}`, e]));
  const plan: WritePlan = { insert: [], refresh: [], kept: 0 };
  for (const p of proposals) {
    const e = have.get(`${p.node_id}|${p.prime_id}`);
    if (!e) plan.insert.push(p);
    else if (e.status === "proposed") plan.refresh.push({ ...p, id: e.id });
    else plan.kept += 1;
  }
  return plan;
}

export interface Wilson {
  n: number;
  k: number;
  rate: number;
  low: number;
  high: number;
}

export function wilson(k: number, n: number, z = 1.96): Wilson {
  if (n === 0) return { n, k, rate: 0, low: 0, high: 0 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { n, k, rate: p, low: Math.max(0, c - m), high: Math.min(1, c + m) };
}

export function approvalBySource(rows: { source: LinkSource; status: LinkStatus }[]): Record<LinkSource, Wilson> {
  const out = {} as Record<LinkSource, Wilson>;
  for (const s of ["cosine", "model", "both", "random"] as LinkSource[]) {
    const decided = rows.filter((r) => r.source === s && r.status !== "proposed");
    out[s] = wilson(decided.filter((r) => r.status === "approved").length, decided.length);
  }
  return out;
}
