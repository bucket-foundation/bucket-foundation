import { createHash } from "node:crypto";
import { isIdeaNode } from "./idea";
import { DISAGREEMENT_CONFIDENCE, INFERRED_CONFIDENCE_MAX, INFERRED_CONFIDENCE_MIN } from "./inference/calibration";
import { components, contractedFactorEdges, factorMap, type DepEdge, type Decomposition } from "./primes";

export type GraphNode = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  branch: string | null;
  summary?: string | null;
  provenanceType?: string | null;
};

export type Target = GraphNode & { status: "prime" | "unfactored" };

export type Candidate = GraphNode & { tier: number | null; prime: boolean };

export type Answer = {
  irreducible: boolean;
  irreducibleWhy?: string;
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
  verification: Verification;
  origin: Origin;
  refd: number | null;
};

export type Verdict = { holds: boolean; why: string };

export type Verification = "confirmed" | "refuted" | "unchecked";
export type Origin = "proposer" | "missing_matched" | "base_idea";

export type NodeProposalRow = {
  key: string;
  title: string;
  branch: string;
  justification: string;
  summary: string | null;
  named_by: string[];
  aliases: string[];
  reasons: Record<string, string>;
  possible_duplicates: { slug: string; title: string; similarity: number }[];
  base_match: string | null;
  model: string;
};

export { BASE_IDEA_SOURCE, DECOMPOSABLE_KINDS, IDEA_SOURCES } from "./idea";

export function isIdea(n: GraphNode): boolean {
  return isIdeaNode(n);
}

export function isCandidateIdea(n: GraphNode): boolean {
  return isIdeaNode(n);
}

export function confidenceFor(v: Verification): number {
  return v === "confirmed" ? INFERRED_CONFIDENCE_MAX : v === "refuted" ? DISAGREEMENT_CONFIDENCE : INFERRED_CONFIDENCE_MIN;
}
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

export function idfOf(pool: { title: string; summary?: string | null }[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const n of pool) for (const t of Array.from(tokens(textOf(n)))) df.set(t, (df.get(t) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const [t, d] of Array.from(df)) out.set(t, Math.log((1 + pool.length) / (1 + d)) + 1);
  return out;
}

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
  vectors?: Map<string, number[]>;
  idf?: Map<string, number>;
  perBranch?: number;
  semantic?: number;
  lexical?: number;
};

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

export function buildPrompt(target: Target, candidates: Candidate[], opts: { rejectedIrreducible?: string | null } = {}): string {
  const lines = candidates.map((c) => `- ${c.slug} | ${c.branch ?? "none"} | ${c.title}`).join("\n");
  const rejected =
    opts.rejectedIrreducible === undefined || opts.rejectedIrreducible === null
      ? ""
      : `A reviewer rejected an earlier answer that this node is irreducible${opts.rejectedIrreducible.trim() ? `, with this reason: ${opts.rejectedIrreducible.trim().replace(/[.!?\s]+$/, "")}` : ""}. Name what it rests on.`;
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
    "Set irreducible to true only if the node rests on nothing more basic, and say why in irreducible_why.",
    rejected,
    "",
    'Answer with JSON only: {"irreducible": false, "irreducible_why": "", "factors": [{"slug": "...", "why": "one sentence"}], "missing": [{"title": "...", "branch": "01-mathematics", "why": "one sentence"}]}',
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

export function clipText(s: unknown, n: number): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  if (t.length <= n) return t;
  const head = t.slice(0, n);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  if (sentence >= n / 2) return head.slice(0, sentence + 1);
  const word = head.lastIndexOf(" ");
  return `${(word > 0 ? head.slice(0, word) : head.slice(0, n - 1)).replace(/[\s,;:]+$/, "")}…`;
}

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
  const clip = clipText;
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
  const irreducible = raw?.irreducible === true && factors.length === 0;
  return { irreducible, irreducibleWhy: irreducible ? clip(raw?.irreducible_why, 800) : undefined, factors, missing };
}

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
    out.set(slug, { holds: v.holds, why: clipText(v?.why, 400) });
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
  origin?: Origin;
  reasons?: Map<string, string>;
};

export function verificationOf(v: Verdict | undefined): Verification {
  return v ? (v.holds ? "confirmed" : "refuted") : "unchecked";
}

export function toProposals(target: Target, answer: Answer, ctx: ProposalContext): ProposalRow[] {
  const { model, hash, verdicts, verifyModel, verifyHash, impact, branchOf } = ctx;
  return answer.factors.map((f) => {
    const v = verdicts.get(f.slug);
    const verification = verificationOf(v);
    return {
      from_slug: f.slug,
      to_slug: target.slug,
      branch: target.branch,
      confidence: confidenceFor(verification),
      confidence_source: CONFIDENCE_SOURCE,
      agreement: verification === "confirmed",
      justification: ctx.reasons?.get(f.slug) || f.why || `named as a factor of ${target.title}`,
      secondary_justification: v ? `${verifyModel}: ${v.why || (v.holds ? "confirmed" : "not confirmed")}` : null,
      model,
      prompt_hash: hash,
      secondary_prompt_hash: verifyHash,
      status: "pending",
      impact,
      cross_branch: (branchOf.get(f.slug) ?? null) !== target.branch,
      verification,
      origin: ctx.origin ?? "proposer",
      refd: null,
    };
  });
}

export function seeded(seed: string): () => number {
  let h = parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function blindSet(target: Target, picks: Candidate[], shortlisted: Candidate[]): { items: Candidate[]; picked: Set<string> } {
  const picked = new Set(picks.map((p) => p.slug));
  const rand = seeded(`blind:${target.slug}`);
  const others = shortlisted.filter((c) => !picked.has(c.slug)).map((c) => ({ c, r: rand() }));
  others.sort((a, b) => a.r - b.r);
  const extra = others.slice(0, Math.max(2, picks.length)).map((o) => o.c);
  const items = picks.concat(extra).map((c) => ({ c, r: rand() }));
  items.sort((a, b) => a.r - b.r);
  return { items: items.map((i) => i.c), picked };
}

export type AgreementRow = { target: string; slug?: string; picked: boolean; holds: boolean };

export type AgreementStats = {
  pairs: number;
  targets: number;
  table: { pickedHolds: number; pickedNot: number; passedHolds: number; passedNot: number };
  observed: number;
  kappa: number | null;
  kappaInterval: [number, number] | null;
};

function kappaOf(rows: AgreementRow[]): number | null {
  const n = rows.length;
  if (!n) return null;
  let a = 0;
  let pickYes = 0;
  let holdYes = 0;
  for (const r of rows) {
    if (r.picked === r.holds) a++;
    if (r.picked) pickYes++;
    if (r.holds) holdYes++;
  }
  const po = a / n;
  const pe = (pickYes / n) * (holdYes / n) + (1 - pickYes / n) * (1 - holdYes / n);
  return pe >= 1 ? null : (po - pe) / (1 - pe);
}

export function agreementStats(rows: AgreementRow[], resamples = 1000, seed = "kappa"): AgreementStats {
  const table = { pickedHolds: 0, pickedNot: 0, passedHolds: 0, passedNot: 0 };
  for (const r of rows) {
    if (r.picked && r.holds) table.pickedHolds++;
    else if (r.picked) table.pickedNot++;
    else if (r.holds) table.passedHolds++;
    else table.passedNot++;
  }
  const byTarget = new Map<string, AgreementRow[]>();
  for (const r of rows) {
    if (!byTarget.has(r.target)) byTarget.set(r.target, []);
    byTarget.get(r.target)!.push(r);
  }
  const groups = Array.from(byTarget.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, g]) => g);
  const kappa = kappaOf(rows);
  let interval: [number, number] | null = null;
  if (groups.length >= 2 && kappa !== null) {
    const rand = seeded(seed);
    const ks: number[] = [];
    for (let i = 0; i < resamples; i++) {
      const sample: AgreementRow[] = [];
      for (let j = 0; j < groups.length; j++) sample.push(...groups[Math.floor(rand() * groups.length)]);
      const k = kappaOf(sample);
      if (k !== null) ks.push(k);
    }
    ks.sort((x, y) => x - y);
    if (ks.length) interval = [ks[Math.floor(0.025 * (ks.length - 1))], ks[Math.ceil(0.975 * (ks.length - 1))]];
  }
  return {
    pairs: rows.length,
    targets: groups.length,
    table,
    observed: rows.length ? (table.pickedHolds + table.passedNot) / rows.length : 0,
    kappa,
    kappaInterval: interval,
  };
}

export const BASE_IDEAS: { key: string; heads: string[] }[] = [
  { key: "THE SAME (equality)", heads: ["equality", "equivalence", "identity", "sameness"] },
  { key: "ONE, TWO (number)", heads: ["number", "numeral", "counting", "cardinality", "integer"] },
  { key: "set", heads: ["set", "collection"] },
  { key: "KIND (category)", heads: ["kind", "category", "classification"] },
  { key: "PART (part and whole)", heads: ["part", "whole", "mereology"] },
  { key: "BECAUSE (cause)", heads: ["cause", "causation", "causality"] },
  { key: "IF (condition, implication)", heads: ["implication", "conditional", "inference", "deduction", "entailment"] },
  { key: "NOT (negation)", heads: ["negation", "contradiction"] },
  { key: "TRUE (truth)", heads: ["truth", "proposition", "bivalence"] },
  { key: "TIME", heads: ["time", "duration"] },
  { key: "PLACE (location)", heads: ["place", "location"] },
  { key: "ALL, SOME (quantifiers)", heads: ["quantifier", "quantification"] },
  { key: "function", heads: ["function", "mapping"] },
  { key: "measurement", heads: ["measurement", "measure", "unit"] },
];

const CONTAINERS = new Set(["law", "principle", "theory", "concept", "notion", "idea", "axiom", "rule", "postulate"]);

export function headNoun(title: string): string {
  let t = title.split(/\s+as\s+/i)[0];
  const ofMatch = /^(?:the\s+)?(\w+)\s+of\s+(?:(?:the|a|an)\s+)?(.+)$/i.exec(t.trim());
  if (ofMatch && CONTAINERS.has(ofMatch[1].toLowerCase()) && /^[\w-]+$/.test(ofMatch[2].split(/\s*\(|,|:/)[0].trim())) t = ofMatch[2];
  const phrase = t.split(/\s\/\s|\s*\(|,|\s+and\s+|\s+of\s+|:|\s-\s/i)[0];
  const words = phrase
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length ? stem(words[words.length - 1]) : "";
}

export function matchBase(title: string): string | null {
  const head = headNoun(title);
  if (!head) return null;
  return BASE_IDEAS.find((b) => b.heads.some((h) => stem(h) === head))?.key ?? null;
}

export function missingKey(title: string): string {
  return title
    .split(/\s\/\s|\s*\(/)[0]
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type MissingPrime = {
  key: string;
  title: string;
  titles: string[];
  branches: Record<string, number>;
  targets: string[];
  reasons: Record<string, string>;
};

export function aggregateMissing(results: { target: Target; answer: Answer }[]): MissingPrime[] {
  const by = new Map<string, MissingPrime>();
  const ordered = results.slice().sort((a, b) => a.target.slug.localeCompare(b.target.slug));
  for (const { target, answer } of ordered) {
    for (const m of answer.missing) {
      const key = missingKey(m.title);
      if (!key) continue;
      if (!by.has(key)) by.set(key, { key, title: m.title, titles: [], branches: {}, targets: [], reasons: {} });
      const e = by.get(key)!;
      if (!e.titles.includes(m.title)) e.titles.push(m.title);
      if (m.branch) e.branches[m.branch] = (e.branches[m.branch] ?? 0) + 1;
      if (!e.targets.includes(target.slug)) e.targets.push(target.slug);
      if (m.why && !e.reasons[target.slug]) e.reasons[target.slug] = m.why;
    }
  }
  return Array.from(by.values()).sort((a, b) => b.targets.length - a.targets.length || a.key.localeCompare(b.key));
}

export function topBranch(branches: Record<string, number>): string | null {
  const best = Object.entries(branches).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : null;
}

export type ConsolidateItem = { id: string; title: string; branch: string | null; nearest: { slug: string; title: string }[] };
export type ConsolidatedGroup = { canonical: string; branch: string; members: string[]; sameAs: string | null; definition: string | null };

export function buildConsolidatePrompt(items: ConsolidateItem[]): string {
  const lines = items.map((it) => {
    const near = it.nearest.map((n) => `${n.slug} = ${n.title}`).join("; ");
    return `- ${it.id} | ${it.branch ?? "none"} | ${it.title}${near ? ` | nearest existing: ${near}` : ""}`;
  });
  return [
    "These are basic ideas a model said a research knowledge graph lacks, collected while decomposing its nodes. Each line is id | branch | title, then the existing nodes closest to it.",
    "",
    ...lines,
    "",
    "Group the lines that name the same idea. Give each group a short canonical title, a noun phrase for the idea itself, and the branch it belongs to.",
    "Give each group a definition: one sentence that says what the idea is, the way a glossary entry would, with no mention of the nodes that need it.",
    "If a group names the same idea as one of its members' nearest existing nodes, set same_as to that node's slug; otherwise null. Related or broader ideas are different ideas.",
    "Every id belongs to exactly one group; a line with no synonym is a group of one.",
    "",
    'Answer with JSON only: {"groups": [{"canonical": "...", "branch": "01-mathematics", "definition": "...", "members": ["id", "..."], "same_as": null}]}',
  ].join("\n");
}

export function parseConsolidation(text: string, items: ConsolidateItem[]): ConsolidatedGroup[] | { error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { error: "no JSON object in the reply" };
  let raw: any;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { error: `unparseable JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const byId = new Map(items.map((it) => [it.id, it]));
  const used = new Set<string>();
  const out: ConsolidatedGroup[] = [];
  for (const g of Array.isArray(raw?.groups) ? raw.groups : []) {
    const members: string[] = [];
    for (const m of Array.isArray(g?.members) ? g.members : []) {
      if (typeof m !== "string" || !byId.has(m) || used.has(m)) continue;
      used.add(m);
      members.push(m);
    }
    if (!members.length) continue;
    const canonical = typeof g?.canonical === "string" && g.canonical.trim() ? g.canonical.trim().slice(0, 120) : byId.get(members[0])!.title;
    const nearest = new Set(members.flatMap((m) => byId.get(m)!.nearest.map((n) => n.slug)));
    const sameAs = typeof g?.same_as === "string" && nearest.has(g.same_as) ? g.same_as : null;
    const definition = clipText(g?.definition, 400) || null;
    out.push({ canonical, branch: typeof g?.branch === "string" ? g.branch.trim().slice(0, 40) : "", members, sameAs, definition });
  }
  for (const it of items) if (!used.has(it.id)) out.push({ canonical: it.title, branch: it.branch ?? "", members: [it.id], sameAs: null, definition: null });
  return out;
}

export type ConsolidationOutcome = {
  matched: { slug: string; targets: string[]; reasons: Record<string, string>; titles: string[] }[];
  nodeProposals: NodeProposalRow[];
};

export function consolidate(
  groups: ConsolidatedGroup[],
  missing: MissingPrime[],
  model: string,
  duplicatesOf: (title: string, exclude: ReadonlySet<string>) => { slug: string; title: string; similarity: number }[],
): ConsolidationOutcome {
  const byKey = new Map(missing.map((m) => [m.key, m]));
  const matched: ConsolidationOutcome["matched"] = [];
  const rows: NodeProposalRow[] = [];
  for (const g of groups) {
    const members = g.members.map((k) => byKey.get(k)).filter(Boolean) as MissingPrime[];
    if (!members.length) continue;
    const targets = Array.from(new Set(members.flatMap((m) => m.targets))).sort();
    const reasons: Record<string, string> = {};
    for (const m of members) for (const [t, r] of Object.entries(m.reasons)) if (!reasons[t]) reasons[t] = r;
    const titles = Array.from(new Set(members.flatMap((m) => m.titles))).sort();
    if (g.sameAs) {
      matched.push({ slug: g.sameAs, targets, reasons, titles });
      continue;
    }
    const branches: Record<string, number> = {};
    for (const m of members) for (const [b, n] of Object.entries(m.branches)) branches[b] = (branches[b] ?? 0) + n;
    rows.push({
      key: missingKey(g.canonical),
      title: g.canonical,
      branch: g.branch || topBranch(branches) || "01-mathematics",
      justification: reasons[targets[0]] ?? `Named as a missing base idea by ${targets.length} node(s).`,
      summary: g.definition,
      named_by: targets,
      aliases: titles.filter((t) => t !== g.canonical),
      reasons,
      possible_duplicates: duplicatesOf(g.canonical, new Set(targets)).filter((d) => !targets.includes(d.slug)),
      base_match: matchBase(g.canonical),
      model,
    });
  }
  const merged = new Map<string, NodeProposalRow>();
  for (const r of rows) {
    const e = merged.get(r.key);
    if (!e) merged.set(r.key, r);
    else {
      e.named_by = Array.from(new Set(e.named_by.concat(r.named_by))).sort();
      e.aliases = Array.from(new Set(e.aliases.concat(r.aliases, r.title !== e.title ? [r.title] : []))).sort();
      e.reasons = { ...r.reasons, ...e.reasons };
      e.summary = e.summary ?? r.summary;
      e.possible_duplicates = duplicatesOf(e.title, new Set(e.named_by)).filter((d) => !e.named_by.includes(d.slug));
    }
  }
  return { matched, nodeProposals: Array.from(merged.values()).sort((a, b) => b.named_by.length - a.named_by.length || a.key.localeCompare(b.key)) };
}

export function cyclicPairs(edges: DepEdge[], proposals: { from_slug: string; to_slug: string }[], idOf: Map<string, string>): Set<string> {
  const all: DepEdge[] = edges.slice();
  for (const p of proposals) {
    const f = idOf.get(p.from_slug);
    const t = idOf.get(p.to_slug);
    if (f && t) all.push({ fromId: f, toId: t, kind: "prerequisite" });
  }
  const factors = factorMap(all);
  const ids = new Set<string>();
  for (const [n, fs] of Array.from(factors)) {
    ids.add(n);
    for (const f of Array.from(fs.keys())) ids.add(f);
  }
  const comp = components(Array.from(ids), factors);
  const out = new Set<string>();
  for (const p of proposals) {
    const f = idOf.get(p.from_slug);
    const t = idOf.get(p.to_slug);
    if (f && t && comp.get(f) === comp.get(t)) out.add(`${p.from_slug}->${p.to_slug}`);
  }
  return out;
}

export function answeringModel(modelUsage: unknown, requested: string): string {
  if (!modelUsage || typeof modelUsage !== "object") return requested;
  let best: string | null = null;
  let most = -1;
  for (const [id, u] of Object.entries(modelUsage as Record<string, { outputTokens?: unknown }>)) {
    const out = typeof u?.outputTokens === "number" ? u.outputTokens : 0;
    if (out > most) {
      most = out;
      best = id;
    }
  }
  return best ?? requested;
}

export function applyVerdicts(rows: ProposalRow[], verdicts: Map<string, Verdict>, verifyModel: string, hash: string): number {
  let n = 0;
  for (const p of rows) {
    const verdict = verdicts.get(p.from_slug);
    if (!verdict) continue;
    const ver = verificationOf(verdict);
    p.verification = ver;
    p.confidence = confidenceFor(ver);
    p.agreement = ver === "confirmed";
    p.secondary_justification = `${verifyModel}: ${verdict.why || (verdict.holds ? "confirmed" : "not confirmed")}`;
    p.secondary_prompt_hash = hash;
    n++;
  }
  return n;
}

export function reuseEarlierKeys(
  rows: NodeProposalRow[],
  earlier: { key: string; title: string }[],
  similarity: (newKey: string, earlierKey: string) => number,
  threshold: number,
): number {
  let reused = 0;
  const known = new Set(earlier.map((e) => e.key));
  for (const r of rows) {
    if (known.has(r.key)) continue;
    let best: { key: string; title: string } | null = null;
    let bestScore = -Infinity;
    for (const e of earlier) {
      const s = similarity(r.key, e.key);
      if (s > bestScore || (s === bestScore && best && e.key < best.key)) {
        best = e;
        bestScore = s;
      }
    }
    if (best && bestScore >= threshold) {
      r.aliases = Array.from(new Set(r.aliases.concat([r.title]))).filter((t) => t !== best!.title);
      r.key = best.key;
      r.title = best.title;
      reused++;
    }
  }
  return reused;
}

export function irreducibleAction(
  prior: { status: string; decision_reason: string | null } | null,
  why: string,
  ctx: { model: string; promptHash: string },
):
  | { op: "insert"; row: { justification: string; model: string; prompt_hash: string } }
  | { op: "reopen"; row: { status: "pending"; justification: string; model: string; prompt_hash: string; reviewer_id: null; decision_reason: null; decided_at: null } }
  | { op: "skip" } {
  const justification = why.trim() || "The proposer found nothing more basic among the candidates.";
  if (!prior) return { op: "insert", row: { justification, model: ctx.model, prompt_hash: ctx.promptHash } };
  if (prior.status !== "rejected") return { op: "skip" };
  const note = prior.decision_reason?.trim() ? ` A reviewer rejected an earlier verdict: ${prior.decision_reason.trim()}` : " A reviewer rejected an earlier verdict.";
  return {
    op: "reopen",
    row: { status: "pending", justification: `${justification}${note}`, model: ctx.model, prompt_hash: ctx.promptHash, reviewer_id: null, decision_reason: null, decided_at: null },
  };
}

export function ideaLayer<N extends GraphNode>(nodes: N[], edges: DepEdge[]): { nodes: N[]; edges: DepEdge[] } {
  const ideas = nodes.filter((n) => isIdea(n));
  return { nodes: ideas, edges: contractedFactorEdges(new Set(ideas.map((n) => n.id)), edges) };
}

export function modelMatchesAlias(alias: string, modelId: string): boolean {
  const family = ["haiku", "sonnet", "opus"].find((f) => alias === f);
  return family ? modelId.includes(family) : modelId === alias;
}
