/**
 * The Bucket research agent loop — PLAN → RETRIEVE → SYNTHESIZE → OUTPUT.
 *
 * This is the produce-side wedge: given a research question it does not just
 * summarize, it runs a small grounded research loop and returns a CITED,
 * REPRODUCIBLE brief. Extracted from the route so it is testable (Next.js
 * forbids non-handler exports from a route file).
 *
 * Safety posture is the tutor's, transposed from one atom to a literature set
 * (S1–S7, enforced IN CODE not in the prompt):
 *   - S1 grounding: synthesis reads ONLY the retrieved Source snippets.
 *   - S2 abstain on thin retrieval: too few sources => the agent abstains and
 *        says what it would need, rather than guessing.
 *   - S3 closed-set citations: every claim must cite a retrieved Source `id`;
 *        any claim whose citation is not in the retrieved set is DROPPED before
 *        the brief is returned. Fabricated DOIs/citations can never surface
 *        because the source list is built from upstream payloads, and the model
 *        may only reference ids we already hold.
 *   - S4 confidence + abstained flags are returned.
 *   - S7 unparseable model output => fail-safe abstaining brief.
 */
import { complete, type ChatMessage } from "./llm";
import {
  retrieveCanon,
  retrieveOpenAlex,
  retrievePubMed,
  retrieveAtlas,
  matchMethods,
  type Source,
  type RetrievalLog,
  type MethodsMatch,
} from "./retrievers";

export type Plan = {
  restated: string;
  sub_questions: string[];
  method_outline: string[];
};

export type BriefFinding = {
  statement: string;
  citations: Array<{ id: string; title: string; url?: string; doi?: string }>;
};

export type Brief = {
  question: string;
  abstained: boolean;
  confidence: "high" | "medium" | "low";
  plan: Plan;
  method_match: MethodsMatch;
  findings: BriefFinding[];
  limitations: string[];
  sources: Source[];
  /** Reproducibility ledger — the exact tool/API calls the agent made. */
  calls: RetrievalLog[];
  provider: "local" | "anthropic";
  notes: string[];
};

const PLAN_MAX_TOKENS = 600;
const SYNTH_MAX_TOKENS = 1800;
// Below this many distinct retrieved sources we will not attempt synthesis —
// the safe move is to abstain (S2).
const MIN_SOURCES_FOR_SYNTHESIS = 3;
// Cap the evidence FED to synthesis. The full retrieved set is still the closed
// citation set + the rendered source list, but feeding 20+ snippets to a small
// local model produces an over-long response that truncates mid-JSON. A focused
// dozen keeps the synthesis completable while still spanning every retriever.
const MAX_EVIDENCE_FOR_SYNTHESIS = 12;

// ---- PLAN ----------------------------------------------------------------

const PLAN_SYSTEM = `You are the planning stage of a grounded research agent. Decompose a research question into a short, concrete plan that a literature/data search can execute. Do NOT answer the question. Do NOT assert any facts. Only structure the inquiry.

Return ONLY a JSON object, no markdown fences, of exactly this shape:
{"restated": string, "sub_questions": string[], "method_outline": string[]}

Rules:
- "restated": one sentence restating the question precisely.
- "sub_questions": 2 to 4 focused, searchable sub-questions.
- "method_outline": 2 to 4 short steps describing HOW one would investigate (e.g. "search recent OpenAlex works on X", "check canon for the underlying principle"). No claims, no findings.`;

/** Robustly pull the first complete JSON object out of a model response. Small
 *  local models like to wrap output in ```json fences and sometimes append
 *  trailing prose; a brace-balanced scan finds the object regardless. */
function parseJsonObject<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  // Try last-brace first (fast path), then a balanced scan as a fallback.
  const candidates: string[] = [];
  const lastEnd = cleaned.lastIndexOf("}");
  if (lastEnd > start) candidates.push(cleaned.slice(start, lastEnd + 1));
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        candidates.push(cleaned.slice(start, i + 1));
        break;
      }
    }
  }
  for (const c of candidates) {
    try {
      return JSON.parse(c) as T;
    } catch {
      /* try next candidate */
    }
  }
  // Salvage a response truncated mid-JSON (small model hit max_tokens): close
  // any open string, drop a dangling trailing fragment, and balance braces +
  // brackets. Only accepted if it parses — never fabricates content.
  const salvaged = salvageTruncatedJson(cleaned.slice(start));
  if (salvaged) {
    try {
      return JSON.parse(salvaged) as T;
    } catch {
      /* fall through */
    }
  }
  return null;
}

function salvageTruncatedJson(s: string): string | null {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  let lastSafe = -1; // index just after the last char at depth>=1 outside a string
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
    if (!inStr && (ch === "}" || ch === "]" || ch === '"' || /[0-9a-zA-Z]/.test(ch))) lastSafe = i + 1;
  }
  if (stack.length === 0) return null; // not actually open → nothing to salvage
  let core = s.slice(0, lastSafe > 0 ? lastSafe : s.length).replace(/,\s*$/, "");
  // close in reverse order
  for (let i = stack.length - 1; i >= 0; i--) core += stack[i];
  return core;
}

/** Normalize a model-emitted citation id to match a retrieved Source id. The
 *  synthesis prompt shows ids as `[id]`, so the model frequently echoes the
 *  brackets — strip them (and stray whitespace/trailing punctuation). */
function normalizeCiteId(raw: string): string {
  return String(raw).trim().replace(/^\[+/, "").replace(/\]+$/, "").trim();
}

export async function plan(question: string): Promise<Plan> {
  const messages: ChatMessage[] = [{ role: "user", content: `RESEARCH QUESTION: ${question}` }];
  let text = "";
  try {
    text = await complete(PLAN_SYSTEM, messages, PLAN_MAX_TOKENS);
  } catch {
    text = "";
  }
  const parsed = parseJsonObject<Partial<Plan>>(text);
  // Fail-safe plan: if the model can't structure it, fall back to a minimal,
  // deterministic plan derived from the question itself (the loop still runs).
  const subs = Array.isArray(parsed?.sub_questions) && parsed!.sub_questions.length
    ? parsed!.sub_questions.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
    : [question];
  const outline = Array.isArray(parsed?.method_outline) && parsed!.method_outline.length
    ? parsed!.method_outline.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
    : ["Search live literature (OpenAlex, PubMed)", "Check the Bucket canon for the underlying principle"];
  return {
    restated: (parsed?.restated && String(parsed.restated).trim()) || question,
    sub_questions: subs,
    method_outline: outline,
  };
}

// ---- RETRIEVE ------------------------------------------------------------

function dedupeSources(all: Source[]): Source[] {
  const byId = new Map<string, Source>();
  for (const s of all) if (!byId.has(s.id)) byId.set(s.id, s);
  return Array.from(byId.values());
}

export async function retrieve(
  question: string,
  plan: Plan,
): Promise<{ sources: Source[]; calls: RetrievalLog[]; methodMatch: MethodsMatch }> {
  const calls: RetrievalLog[] = [];
  const collected: Source[] = [];

  // 1) Route the headline question through MethodsMatcher (picks the Bucket
  //    instrument + surfaces exemplar papers we can cite).
  const mm = await matchMethods(question);
  calls.push(mm.log);
  collected.push(...mm.sources);

  // 2) Canon grounding (local, deterministic) on the question + each sub-q.
  const canonQueries = [question, ...plan.sub_questions].slice(0, 3);
  for (const q of canonQueries) {
    const r = retrieveCanon(q, 3);
    calls.push(...r.log);
    collected.push(...r.sources);
  }

  // 3) Live literature for the question + the first sub-question. Run the
  //    public APIs in parallel; each degrades to [] on failure.
  const litQueries = [question, plan.sub_questions[0]].filter(Boolean).slice(0, 2) as string[];
  const litBatches = await Promise.all(
    litQueries.flatMap((q) => [retrieveOpenAlex(q, 4), retrievePubMed(q, 3)]),
  );
  for (const b of litBatches) {
    calls.push(...b.log);
    collected.push(...b.sources);
  }

  // 4) Research-atlas headline stats — grounding for any metascience claim.
  const atlas = await retrieveAtlas();
  calls.push(...atlas.log);
  collected.push(...atlas.sources);

  return { sources: dedupeSources(collected), calls, methodMatch: mm.match };
}

// ---- SYNTHESIZE ----------------------------------------------------------

function synthSystem(): string {
  return `You are the synthesis stage of a grounded research agent. You write a short research brief STRICTLY over the EVIDENCE provided. The evidence is the ONLY source of truth.

HARD RULES (a confidently-wrong cited claim is the worst failure — it launders fabrication as scholarship):
1. Use ONLY the EVIDENCE blocks. Never introduce facts, numbers, mechanisms, or history not supported by an evidence snippet. Do not use outside knowledge to assert facts.
2. Every finding MUST cite at least one evidence id (the [id] shown). Put the ids you used in that finding's "citations" array, copied verbatim. A finding with no citation will be DROPPED — do not write uncited findings.
3. NEVER invent a citation id, DOI, URL, author, or paper. Cite only ids that appear in the EVIDENCE. If the evidence does not support a point, omit the point.
4. Extract what the evidence DOES support, even if partial. If an evidence block is on-topic but indirect, write a finding that states exactly what it shows and mark "confidence" lower — do NOT discard usable evidence. Reserve "abstained": true for the case where NONE of the evidence blocks are relevant to the question at all; then write an empty "findings" array and say in "limitations" what evidence would be needed. When at least one or two blocks bear on the question, you must produce those findings rather than abstain.
5. State limitations honestly: what the evidence does NOT establish, conflicts, recency gaps, or that a snippet is only a title (PubMed esummary has no abstract — do not infer findings from a bare title).
6. Set "confidence": "high" only if multiple evidence blocks directly converge; "medium" if partial or indirect; "low" if a single block weakly supports it.

Return ONLY a JSON object, no markdown fences, of exactly this shape:
{"abstained": boolean, "confidence": "high"|"medium"|"low", "findings": [{"statement": string, "citations": string[]}], "limitations": string[]}`;
}

function evidenceBlock(sources: Source[]): string {
  return sources
    .map((s) => {
      const bits = [
        `[${s.id}] (${s.kind})`,
        s.title ? `TITLE: ${s.title}` : "",
        s.year ? `YEAR: ${s.year}` : "",
        s.doi ? `DOI: ${s.doi}` : "",
        `EVIDENCE: ${s.snippet}`,
      ].filter(Boolean);
      return bits.join("\n");
    })
    .join("\n\n---\n\n");
}

type SynthOut = {
  abstained: boolean;
  confidence: "high" | "medium" | "low";
  findings: Array<{ statement: string; citations: string[] }>;
  limitations: string[];
};

/** Validate the model's findings against the closed set of retrieved source ids
 *  (S3). Drops any citation id not retrieved, then drops any finding left with
 *  no valid citation. Fabricated references can never reach the brief. */
export function validateFindings(
  raw: Array<{ statement: string; citations: string[] }>,
  sources: Source[],
): { findings: BriefFinding[]; dropped: number } {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const findings: BriefFinding[] = [];
  let dropped = 0;
  for (const f of raw) {
    if (!f || typeof f.statement !== "string" || !f.statement.trim()) {
      dropped++;
      continue;
    }
    const cites = (Array.isArray(f.citations) ? f.citations : [])
      .map((id) => byId.get(normalizeCiteId(id)))
      .filter((s): s is Source => !!s);
    if (cites.length === 0) {
      dropped++; // S3: uncited finding is dropped
      continue;
    }
    const seen = new Set<string>();
    findings.push({
      statement: f.statement.trim(),
      citations: cites
        .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
        .map((s) => ({ id: s.id, title: s.title, url: s.url, doi: s.doi })),
    });
  }
  return { findings, dropped };
}

/** Pick the evidence we actually hand to the synthesizer: prefer sources that
 *  carry real prose (an abstract / canon excerpt / atlas stats) over bare-title
 *  records, span every retriever that returned something, and cap the count so
 *  a small local model can finish the JSON. The full retrieved set remains the
 *  closed citation set, so nothing the model cites can fall outside it. */
/** Does this source carry genuine evidentiary prose (an abstract / a real canon
 *  excerpt / atlas numbers), as opposed to a bare title or a label-only stub? */
function hasRealProse(s: Source): boolean {
  const t = (s.snippet || "").trim();
  if (!t || t.startsWith("(no abstract")) return false;
  // MethodsMatcher exemplars carry only a "Exemplar method paper for …" label,
  // not the paper's content — useful as a pointer, not as evidence to cite.
  if (s.provenance.retriever === "methods") return false;
  // A bare PubMed esummary line ("Title — Journal (date).") is a reference, not
  // evidence; treat it as weak.
  if (s.kind === "pubmed") return false;
  return t.length >= 60;
}

export function selectEvidence(sources: Source[], cap = MAX_EVIDENCE_FOR_SYNTHESIS): Source[] {
  // Rank by how directly the snippet can support an empirical claim:
  //   3  OpenAlex work WITH a real abstract (strongest grounding)
  //   2  research-atlas stats (hard numbers, for metascience questions)
  //   1  Bucket canon excerpt with real prose (foundational/axiomatic)
  //   0  everything else (label-only exemplars, bare titles, empty abstracts)
  const rank = (s: Source): number => {
    if (s.kind === "openalex") return hasRealProse(s) ? 3 : 0;
    if (s.kind === "atlas") return 2;
    if (s.kind === "canon") return hasRealProse(s) ? 1 : 0;
    return 0; // pubmed bare-title, methods label
  };
  const scored = sources
    .map((s, i) => ({ s, i, r: rank(s) }))
    .sort((a, b) => b.r - a.r || a.i - b.i); // stable within a tier

  // Don't dilute synthesis with weak material when strong evidence exists. The
  // Bucket canon for several branches is conversational transcript material —
  // foundational in spirit but noisy as literal evidence — so it is tier 1 and
  // only feeds synthesis when there isn't enough tier-2+ literature/atlas
  // grounding to stand on its own. (The full retrieved set is still the closed
  // citation set + the rendered source list, regardless of what synthesis sees.)
  const tier2plus = scored.filter((x) => x.r >= 2);
  const tier1plus = scored.filter((x) => x.r >= 1);
  let chosen: typeof scored;
  if (tier2plus.length >= MIN_SOURCES_FOR_SYNTHESIS) chosen = tier2plus;
  else if (tier1plus.length >= MIN_SOURCES_FOR_SYNTHESIS) chosen = tier1plus;
  else chosen = scored;
  return chosen.slice(0, cap).map((x) => x.s);
}

export async function synthesize(
  question: string,
  sources: Source[],
): Promise<{ out: SynthOut; rawText: string }> {
  const evidence = selectEvidence(sources);
  const messages: ChatMessage[] = [
    {
      role: "user",
      content:
        `RESEARCH QUESTION: ${question}\n\n` +
        `EVIDENCE (your ONLY source of truth — cite by [id]):\n\n${evidenceBlock(evidence)}`,
    },
  ];
  const rawText = await complete(synthSystem(), messages, SYNTH_MAX_TOKENS);
  const parsed = parseJsonObject<SynthOut>(rawText);
  if (!parsed) {
    // S7 fail-safe: untrusted structure => abstain.
    return {
      out: { abstained: true, confidence: "low", findings: [], limitations: ["The synthesizer returned output that could not be parsed; abstaining rather than risk an ungrounded brief."] },
      rawText,
    };
  }
  return {
    out: {
      abstained: parsed.abstained === true,
      confidence: parsed.confidence === "high" || parsed.confidence === "low" ? parsed.confidence : "medium",
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
    },
    rawText,
  };
}

// ---- OUTPUT (the full loop) ----------------------------------------------

export async function runResearchAgent(
  question: string,
  provider: "local" | "anthropic",
): Promise<Brief> {
  const notes: string[] = [];

  // 1. PLAN
  const thePlan = await plan(question);

  // 2. RETRIEVE
  const { sources, calls, methodMatch } = await retrieve(question, thePlan);

  // S2: abstain if retrieval is too thin to synthesize responsibly.
  if (sources.length < MIN_SOURCES_FOR_SYNTHESIS) {
    notes.push(
      `Retrieved only ${sources.length} source(s) (< ${MIN_SOURCES_FOR_SYNTHESIS}); abstaining rather than synthesizing on thin evidence.`,
    );
    return {
      question,
      abstained: true,
      confidence: "low",
      plan: thePlan,
      method_match: methodMatch,
      findings: [],
      limitations: [
        "Too little grounding was retrieved to answer responsibly.",
        "Try a more specific question, or one closer to the Bucket canon (biophysics, physics, chemistry, information, mathematics, cosmology, mind) or the indexed literature.",
      ],
      sources,
      calls,
      provider,
      notes,
    };
  }

  // 3. SYNTHESIZE
  let synth: Awaited<ReturnType<typeof synthesize>>;
  try {
    synth = await synthesize(question, sources);
  } catch (e) {
    // Provider error mid-synthesis — surface as an abstaining brief (the route
    // maps hard provider errors to 502 before this; this is the soft path).
    notes.push(`Synthesis failed (${(e as Error).message}); returning an abstaining brief.`);
    return {
      question,
      abstained: true,
      confidence: "low",
      plan: thePlan,
      method_match: methodMatch,
      findings: [],
      limitations: ["The synthesis model was unreachable; the plan and retrieved sources are still shown for reproducibility."],
      sources,
      calls,
      provider,
      notes,
    };
  }

  // S3: validate citations against the closed retrieved set; drop fabrications.
  const { findings, dropped } = validateFindings(synth.out.findings, sources);
  if (dropped > 0) notes.push(`Dropped ${dropped} finding(s) with no valid (retrieved) citation (closed-set citation rule).`);

  // If the model claimed to answer but every finding was uncited, that is an
  // abstain in effect.
  const effectiveAbstain = synth.out.abstained || findings.length === 0;
  if (effectiveAbstain && findings.length === 0 && !synth.out.abstained) {
    notes.push("All findings were dropped as uncited; treating as an abstention.");
  }

  const limitations = [...synth.out.limitations];
  if (methodMatch.degraded) limitations.push("MethodsMatcher ran in degraded mode (no live literature for the method scan).");

  return {
    question,
    abstained: effectiveAbstain,
    confidence: effectiveAbstain ? "low" : synth.out.confidence,
    plan: thePlan,
    method_match: methodMatch,
    findings,
    limitations,
    sources,
    calls,
    provider,
    notes,
  };
}
