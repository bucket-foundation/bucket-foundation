/**
 * The decompose-further queue (ros-prime 2). learning/research-os/PRIMES.md
 * found the graph's 41 primes are course entry points and 126 concepts carry
 * no dependency edge at all. For each of them, a model names what the node
 * rests on, chosen from a shortlist of existing nodes in every branch, and
 * names base primes the graph lacks. Proposals land in graph.edge_proposals
 * as pending `prerequisite` edges for the /research-os/edges review; only
 * that review's approve action writes graph.edges.
 *
 * Pure: the script in scripts/research-os/decompose-further.ts does the
 * database reads, the model calls, and the writes. Tests in
 * scripts/test-research-os-decompose-further.ts.
 */
import { createHash } from "node:crypto";
import type { Decomposition } from "./primes";

export type GraphNode = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  branch: string | null;
  summary?: string | null;
};

export type Target = GraphNode & { status: "prime" | "unfactored" };

export type Candidate = GraphNode & { tier: number | null; prime: boolean };

export type Answer = {
  irreducible: boolean;
  factors: { slug: string; why: string }[];
  missing: { title: string; branch: string; why: string }[];
};

export type ProposalRow = {
  from_slug: string;
  to_slug: string;
  branch: string | null;
  confidence: number;
  confidence_source: string;
  agreement: boolean | null;
  justification: string;
  model: string;
  prompt_hash: string;
  status: "pending";
};

/** Kinds worth decomposing: ideas, as opposed to sources, figures, or sites. */
export const DECOMPOSABLE_KINDS = new Set(["concept", "law", "derivation"]);
/** Proposals sit below every applied edge until a reviewer approves them. */
export const PROPOSAL_CONFIDENCE = 0.5;
export const CONFIDENCE_SOURCE = "prime_decompose_llm";
export const MAX_FACTORS = 6;
export const MAX_MISSING = 4;

export function selectTargets(nodes: GraphNode[], dec: Map<string, Decomposition>): Target[] {
  const out: Target[] = [];
  for (const n of nodes) {
    const d = dec.get(n.id);
    if (!d || !DECOMPOSABLE_KINDS.has(n.kind)) continue;
    if (d.status === "prime" || d.status === "unfactored") out.push({ ...n, status: d.status });
  }
  return out.sort((a, b) => (a.status === b.status ? a.slug.localeCompare(b.slug) : a.status === "prime" ? -1 : 1));
}

const STOP = new Set(["the", "and", "of", "a", "an", "in", "to", "for", "on", "with", "as", "by", "is", "its", "from", "at", "or", "into", "how"]);
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/**
 * The candidates offered for one target: every prime, every tier-1 node in
 * every branch, and the closest lexical neighbours. Nodes that already rest
 * on the target are left out, so no proposal can close a cycle.
 */
export function shortlist(target: Target, pool: Candidate[], dec: Map<string, Decomposition>, neighbours = 20): Candidate[] {
  const restsOnTarget = (c: Candidate) => dec.get(c.id)?.signature.has(target.id) ?? false;
  const eligible = pool.filter((c) => c.id !== target.id && DECOMPOSABLE_KINDS.has(c.kind) && !restsOnTarget(c));
  const base = eligible.filter((c) => c.prime || c.tier === 1);
  const t = tokens(`${target.title} ${target.summary ?? ""}`);
  const scored = eligible
    .filter((c) => !(c.prime || c.tier === 1))
    .map((c) => {
      const w = tokens(`${c.title} ${c.summary ?? ""}`);
      let shared = 0;
      for (const x of Array.from(w)) if (t.has(x)) shared++;
      return { c, score: shared / Math.sqrt(Math.max(1, w.size) * Math.max(1, t.size)) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.c.slug.localeCompare(b.c.slug))
    .slice(0, neighbours)
    .map((s) => s.c);
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of base.concat(scored)) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push(c);
  }
  return out.sort((a, b) => (a.branch ?? "").localeCompare(b.branch ?? "") || a.slug.localeCompare(b.slug));
}

export function buildPrompt(target: Target, candidates: Candidate[]): string {
  const lines = candidates.map((c) => `- ${c.slug} | ${c.branch ?? "none"} | ${c.title}`).join("\n");
  return [
    "You are decomposing a node of a research knowledge graph into its factors, the way a number breaks into prime factors.",
    "A factor is an idea the node rests on: someone must hold the factor to hold the node. Factors may come from any branch; physics rests on mathematics, chemistry on physics.",
    "",
    `Node: ${target.title}`,
    `Branch: ${target.branch ?? "none"}`,
    target.summary ? `Summary: ${target.summary}` : "",
    "",
    "Candidate factors, one per line as slug | branch | title:",
    lines,
    "",
    `Pick up to ${MAX_FACTORS} direct factors from the candidates, by slug. Pick only factors the node needs directly; skip what those factors already cover.`,
    `Name up to ${MAX_MISSING} base ideas the node rests on that no candidate covers, such as equality, number, set, function, measurement, or cause, each with the branch it belongs to.`,
    "Set irreducible to true only if the node rests on nothing more basic.",
    "",
    'Answer with JSON only: {"irreducible": false, "factors": [{"slug": "...", "why": "one sentence"}], "missing": [{"title": "...", "branch": "01-mathematics", "why": "one sentence"}]}',
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

/** Pull the first JSON object out of a model reply and keep only valid parts. */
export function parseAnswer(text: string, allowed: Set<string>, targetSlug: string): Answer | { error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { error: "no JSON object in the reply" };
  let raw: any;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { error: `unparseable JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
  const seen = new Set<string>();
  const factors: Answer["factors"] = [];
  for (const f of Array.isArray(raw?.factors) ? raw.factors : []) {
    const slug = clip(f?.slug, 200);
    if (!slug || slug === targetSlug || !allowed.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    factors.push({ slug, why: clip(f?.why, 400) });
    if (factors.length >= MAX_FACTORS) break;
  }
  const missing: Answer["missing"] = [];
  for (const m of Array.isArray(raw?.missing) ? raw.missing : []) {
    const title = clip(m?.title, 120);
    if (!title) continue;
    missing.push({ title, branch: clip(m?.branch, 40), why: clip(m?.why, 400) });
    if (missing.length >= MAX_MISSING) break;
  }
  return { irreducible: raw?.irreducible === true && factors.length === 0, factors, missing };
}

export function toProposals(target: Target, answer: Answer, model: string, hash: string): ProposalRow[] {
  return answer.factors.map((f) => ({
    from_slug: f.slug,
    to_slug: target.slug,
    branch: target.branch,
    confidence: PROPOSAL_CONFIDENCE,
    confidence_source: CONFIDENCE_SOURCE,
    agreement: null,
    justification: f.why || `named as a factor of ${target.title}`,
    model,
    prompt_hash: hash,
    status: "pending",
  }));
}

export type MissingPrime = { title: string; key: string; branches: string[]; targets: string[] };

/** Tally the base ideas the model says the graph lacks, merged by normalized title. */
export function aggregateMissing(results: { target: Target; answer: Answer }[]): MissingPrime[] {
  const by = new Map<string, MissingPrime>();
  for (const { target, answer } of results) {
    for (const m of answer.missing) {
      const key = m.title.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
      if (!key) continue;
      if (!by.has(key)) by.set(key, { title: m.title, key, branches: [], targets: [] });
      const e = by.get(key)!;
      if (m.branch && !e.branches.includes(m.branch)) e.branches.push(m.branch);
      if (!e.targets.includes(target.slug)) e.targets.push(target.slug);
    }
  }
  return Array.from(by.values()).sort((a, b) => b.targets.length - a.targets.length || a.key.localeCompare(b.key));
}
