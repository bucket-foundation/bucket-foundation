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
  /** graph.nodes.provenance.type: where the node came from. */
  provenanceType?: string | null;
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

/**
 * Where an idea node can come from. Canon concept tags, bridges, intake
 * digests, intake targets, and mirrors are groupings of other material (33
 * of the 105 canon concept tags are people, such as Euler and Tesla), so
 * they are neither targets nor factors.
 */
export const IDEA_SOURCES = new Set(["academy_atom", "canon_entry", "reference", "primary_source"]);
/** Base ideas a reviewer added from a missing-prime proposal: factors, never targets. */
export const BASE_IDEA_SOURCE = "node_proposal";

export function isIdea(n: GraphNode): boolean {
  return DECOMPOSABLE_KINDS.has(n.kind) && IDEA_SOURCES.has(n.provenanceType ?? "");
}

export function isCandidateIdea(n: GraphNode): boolean {
  return DECOMPOSABLE_KINDS.has(n.kind) && (IDEA_SOURCES.has(n.provenanceType ?? "") || n.provenanceType === BASE_IDEA_SOURCE);
}
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
    if (!d || !isIdea(n)) continue;
    if (d.status === "prime" || d.status === "unfactored") out.push({ ...n, status: d.status });
  }
  return out.sort((a, b) => (a.status === b.status ? a.slug.localeCompare(b.slug) : a.status === "prime" ? -1 : 1));
}

const STOP = new Set(
  "the and of a an in to for on with as by is its from at or into how are be this that these those it their which what when where why can may use used using via per between within about over under than then also each one two more most other such".split(
    " ",
  ),
);

/** A light suffix stripper: plurals, -ing, -ed. Enough to match "vectors" with "vector". */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && /(sses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  return w;
}

export function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map(stem),
  );
}

const textOf = (n: { title: string; summary?: string | null }) => `${n.title} ${n.summary ?? ""}`;

/** Inverse document frequency of each stemmed token across a pool of nodes. */
export function idfOf(pool: { title: string; summary?: string | null }[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const n of pool) for (const t of Array.from(tokens(textOf(n)))) df.set(t, (df.get(t) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const [t, d] of Array.from(df)) out.set(t, Math.log((1 + pool.length) / (1 + d)) + 1);
  return out;
}

/** Cosine of two stemmed token sets weighted by IDF, so shared rare words count and shared common ones barely do. */
export function lexicalScore(a: string, b: string, idf: Map<string, number>): number {
  const ta = tokens(a);
  const tb = tokens(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const t of Array.from(ta)) {
    const w = idf.get(t) ?? 1;
    na += w * w;
    if (tb.has(t)) dot += w * w;
  }
  for (const t of Array.from(tb)) {
    const w = idf.get(t) ?? 1;
    nb += w * w;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
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
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export type ShortlistOptions = {
  /** Unit vectors by slug (scripts/research-os/embed-texts.py); without them the semantic part is skipped. */
  vectors?: Map<string, number[]>;
  idf?: Map<string, number>;
  /** Lowest-depth nodes offered from every branch, so each branch's base layer is always in view. */
  perBranch?: number;
  semantic?: number;
  lexical?: number;
};

/**
 * The candidates offered for one target, from every public idea node:
 * each branch's lowest-depth nodes (the base layer, ordered by closeness to
 * the target), the nearest nodes by embedding, and the best stemmed IDF
 * matches. Nodes that already rest on the target are left out, so no
 * single proposal can close a cycle with the edges already in the graph.
 */
export function shortlist(target: Target, pool: Candidate[], dec: Map<string, Decomposition>, opts: ShortlistOptions = {}): Candidate[] {
  const perBranch = opts.perBranch ?? 3;
  const semanticN = opts.semantic ?? 25;
  const lexicalN = opts.lexical ?? 10;
  const restsOnTarget = (c: Candidate) => dec.get(c.id)?.signature.has(target.id) ?? false;
  const eligible = pool.filter((c) => c.id !== target.id && isCandidateIdea(c) && !restsOnTarget(c));
  const tv = opts.vectors?.get(target.slug);
  const sim = new Map<string, number>();
  if (tv) for (const c of eligible) {
    const v = opts.vectors!.get(c.slug);
    if (v) sim.set(c.slug, cosine(tv, v));
  }
  const idf = opts.idf ?? idfOf(eligible.concat([target as unknown as Candidate]));
  const lex = new Map<string, number>(eligible.map((c) => [c.slug, lexicalScore(textOf(target), textOf(c), idf)]));
  const closeness = (c: Candidate) => (sim.get(c.slug) ?? 0) + (lex.get(c.slug) ?? 0);

  const picked: Candidate[] = [];
  const byBranch = new Map<string, Candidate[]>();
  for (const c of eligible) {
    if (c.tier === null && !c.prime) continue;
    const b = c.branch ?? "none";
    if (!byBranch.has(b)) byBranch.set(b, []);
    byBranch.get(b)!.push(c);
  }
  for (const list of Array.from(byBranch.values())) {
    list.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || closeness(b) - closeness(a) || a.slug.localeCompare(b.slug));
    picked.push(...list.slice(0, perBranch));
  }
  if (tv) {
    picked.push(
      ...eligible
        .filter((c) => sim.has(c.slug))
        .sort((a, b) => sim.get(b.slug)! - sim.get(a.slug)! || a.slug.localeCompare(b.slug))
        .slice(0, semanticN),
    );
  }
  picked.push(
    ...eligible
      .filter((c) => (lex.get(c.slug) ?? 0) > 0)
      .sort((a, b) => lex.get(b.slug)! - lex.get(a.slug)! || a.slug.localeCompare(b.slug))
      .slice(0, lexicalN),
  );
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of picked) {
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
    `Name up to ${MAX_MISSING} more basic ideas the node rests on that no candidate covers, each with the branch it belongs to.`,
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

/**
 * Merge key for a missing base idea: the title before any slash-separated
 * synonym or parenthetical, lowercased, without a leading article. "Equality
 * / equivalence" and "Equality" share the key "equality".
 */
export function missingKey(title: string): string {
  return title
    .split(/\s\/\s|\s*\(/)[0]
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type MissingPrime = { title: string; key: string; branches: string[]; targets: string[]; why: string };

/** Tally the base ideas the model says the graph lacks, merged by normalized title. */
export function aggregateMissing(results: { target: Target; answer: Answer }[]): MissingPrime[] {
  const by = new Map<string, MissingPrime>();
  for (const { target, answer } of results) {
    for (const m of answer.missing) {
      const key = missingKey(m.title);
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
