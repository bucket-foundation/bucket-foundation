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
  agreement: boolean;
  justification: string;
  secondary_justification: string | null;
  model: string;
  prompt_hash: string;
  secondary_prompt_hash: string | null;
  status: "pending";
  impact: number;
  cross_branch: boolean;
};

export type Verdict = { holds: boolean; why: string };

export type NodeProposalRow = {
  key: string;
  title: string;
  branch: string;
  justification: string;
  named_by: string[];
  base_match: string | null;
  model: string;
  status: "pending";
};

/** Kinds worth decomposing: ideas, as opposed to sources, figures, or sites. */
export const DECOMPOSABLE_KINDS = new Set(["concept", "law", "derivation"]);
/** Confidence when the verifier confirmed the pair, and when it did not. Both sit
 * under the 0.95 a reviewer's approval writes (inference/decide.ts). */
export const CONFIRMED_CONFIDENCE = 0.6;
export const UNCONFIRMED_CONFIDENCE = 0.3;
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

/** Nodes resting on the target: how many decompositions an approved factor reaches. */
export function impactOf(targetId: string, dec: Map<string, Decomposition>): number {
  let n = 0;
  for (const d of Array.from(dec.values())) if (d.id !== targetId && d.signature.has(targetId)) n++;
  return n;
}

export function buildVerifyPrompt(target: Target, factors: Candidate[]): string {
  const lines = factors.map((c) => `- ${c.slug} | ${c.branch ?? "none"} | ${c.title}`).join("\n");
  return [
    "You are checking proposed prerequisite links in a research knowledge graph.",
    `Target: ${target.title} (${target.branch ?? "none"})`,
    target.summary ? `Summary: ${target.summary}` : "",
    "",
    "For each candidate below, answer whether a learner must understand the candidate before they can understand the target.",
    "Answer false when the candidate is only related, only taught nearby, or only useful later.",
    "",
    lines,
    "",
    'Answer with JSON only: {"verdicts": [{"slug": "...", "holds": true, "why": "one sentence"}]}',
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

/** Verdicts by slug for the slugs asked about; anything else in the reply is ignored. */
export function parseVerdicts(text: string, asked: Set<string>): Map<string, Verdict> | { error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { error: "no JSON object in the reply" };
  let raw: any;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { error: `unparseable JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const out = new Map<string, Verdict>();
  for (const v of Array.isArray(raw?.verdicts) ? raw.verdicts : []) {
    const slug = typeof v?.slug === "string" ? v.slug.trim() : "";
    if (!asked.has(slug) || out.has(slug) || typeof v?.holds !== "boolean") continue;
    out.set(slug, { holds: v.holds, why: typeof v?.why === "string" ? v.why.trim().slice(0, 400) : "" });
  }
  return out;
}

export type ProposalContext = {
  model: string;
  hash: string;
  verdicts: Map<string, Verdict>;
  verifyModel: string;
  verifyHash: string | null;
  impact: number;
  branchOf: Map<string, string | null>;
};

export function toProposals(target: Target, answer: Answer, ctx: ProposalContext): ProposalRow[] {
  const { model, hash, verdicts, verifyModel, verifyHash, impact, branchOf } = ctx;
  return answer.factors.map((f) => {
    const v = verdicts.get(f.slug);
    const agreement = v?.holds === true;
    return {
      from_slug: f.slug,
      to_slug: target.slug,
      branch: target.branch,
      confidence: agreement ? CONFIRMED_CONFIDENCE : UNCONFIRMED_CONFIDENCE,
      confidence_source: CONFIDENCE_SOURCE,
      agreement,
      justification: f.why || `named as a factor of ${target.title}`,
      secondary_justification: v ? `${verifyModel}: ${v.why || (v.holds ? "confirmed" : "not confirmed")}` : null,
      model,
      prompt_hash: hash,
      secondary_prompt_hash: verifyHash,
      status: "pending",
      impact,
      cross_branch: (branchOf.get(f.slug) ?? null) !== target.branch,
    };
  });
}

/**
 * Base ideas from the semantic primes (Wierzbicka 1996) and the foundations
 * of mathematics. A missing-prime proposal whose title matches one is
 * flagged for the reviewer. Keys are the flag; patterns match normalized titles.
 */
export const BASE_IDEAS: { key: string; pattern: RegExp }[] = [
  { key: "THE SAME (equality)", pattern: /\b(equality|equal|same|identity|equivalence)\b/ },
  { key: "ONE, TWO (number)", pattern: /\b(number|numbers|counting|quantity|natural numbers?)\b/ },
  { key: "KIND (set, category)", pattern: /\b(set|sets|kind|category|class|classification)\b/ },
  { key: "PART (part and whole)", pattern: /\b(part|parts|whole|composition|component)\b/ },
  { key: "BECAUSE (cause)", pattern: /\b(cause|causes|causation|causal|causality)\b/ },
  { key: "IF (condition, implication)", pattern: /\b(if|implication|conditional|inference|deduction|deductive)\b/ },
  { key: "NOT (negation)", pattern: /\b(not|negation|contradiction)\b/ },
  { key: "TRUE (truth)", pattern: /\b(true|truth|proposition|propositions)\b/ },
  { key: "BEFORE, AFTER, TIME", pattern: /\b(time|before|after|order|sequence|temporal)\b/ },
  { key: "PLACE, WHERE (space)", pattern: /\b(place|space|spatial|position|location)\b/ },
  { key: "ALL, SOME (quantifiers)", pattern: /\b(all|some|quantifier|quantifiers|quantification)\b/ },
  { key: "function", pattern: /\b(function|functions|mapping)\b/ },
  { key: "measurement", pattern: /\b(measure|measurement|unit|units)\b/ },
];

export function matchBase(title: string): string | null {
  const t = title.toLowerCase().replace(/[^a-z0-9 ]+/g, " ");
  return BASE_IDEAS.find((b) => b.pattern.test(t))?.key ?? null;
}

export type MissingPrime = { title: string; key: string; branches: string[]; targets: string[]; why: string };

/** Tally the base ideas the model says the graph lacks, merged by normalized title. */
export function aggregateMissing(results: { target: Target; answer: Answer }[]): MissingPrime[] {
  const by = new Map<string, MissingPrime>();
  for (const { target, answer } of results) {
    for (const m of answer.missing) {
      const key = m.title.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
      if (!key) continue;
      if (!by.has(key)) by.set(key, { title: m.title, key, branches: [], targets: [], why: m.why });
      const e = by.get(key)!;
      if (m.branch && !e.branches.includes(m.branch)) e.branches.push(m.branch);
      if (!e.targets.includes(target.slug)) e.targets.push(target.slug);
    }
  }
  return Array.from(by.values()).sort((a, b) => b.targets.length - a.targets.length || a.key.localeCompare(b.key));
}

/** One pending node proposal per missing prime; the most-named branch first. */
export function toNodeProposals(missing: MissingPrime[], model: string): NodeProposalRow[] {
  return missing.map((m) => ({
    key: m.key,
    title: m.title,
    branch: m.branches[0] ?? "01-mathematics",
    justification: m.why || `named as a base idea by ${m.targets.length} node(s)`,
    named_by: m.targets.slice().sort(),
    base_match: matchBase(m.title),
    model,
    status: "pending",
  }));
}
