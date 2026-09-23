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
  calls: RetrievalLog[];
  provider: "local" | "anthropic";
  notes: string[];
};

const PLAN_MAX_TOKENS = 600;
const SYNTH_MAX_TOKENS = 1800;
const MIN_SOURCES_FOR_SYNTHESIS = 3;
const MAX_EVIDENCE_FOR_SYNTHESIS = 12;

const PLAN_SYSTEM = `You are the planning stage of a grounded research agent. Decompose a research question into a short, concrete plan that a literature/data search can execute. Do NOT answer the question. Do NOT assert any facts. Only structure the inquiry.

Return ONLY a JSON object, no markdown fences, of exactly this shape:
{"restated": string, "sub_questions": string[], "method_outline": string[]}

Rules:
- "restated": one sentence restating the question precisely.
- "sub_questions": 2 to 4 focused, searchable sub-questions.
- "method_outline": 2 to 4 short steps describing HOW one would investigate (e.g. "search recent OpenAlex works on X", "check canon for the underlying principle"). No claims, no findings.`;

function parseJsonObject<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
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
    }
  }
  const salvaged = salvageTruncatedJson(cleaned.slice(start));
  if (salvaged) {
    try {
      return JSON.parse(salvaged) as T;
    } catch {
    }
  }
  return null;
}

function salvageTruncatedJson(s: string): string | null {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  let lastSafe = -1;
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
  if (stack.length === 0) return null;
  let core = s.slice(0, lastSafe > 0 ? lastSafe : s.length).replace(/,\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) core += stack[i];
  return core;
}

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

  const mm = await matchMethods(question);
  calls.push(mm.log);
  collected.push(...mm.sources);

  const canonQueries = [question, ...plan.sub_questions].slice(0, 3);
  for (const q of canonQueries) {
    const r = retrieveCanon(q, 3);
    calls.push(...r.log);
    collected.push(...r.sources);
  }

  const litQueries = [question, plan.sub_questions[0]].filter(Boolean).slice(0, 2) as string[];
  const litBatches = await Promise.all(
    litQueries.flatMap((q) => [retrieveOpenAlex(q, 4), retrievePubMed(q, 3)]),
  );
  for (const b of litBatches) {
    calls.push(...b.log);
    collected.push(...b.sources);
  }

  const atlas = await retrieveAtlas();
  calls.push(...atlas.log);
  collected.push(...atlas.sources);

  return { sources: dedupeSources(collected), calls, methodMatch: mm.match };
}

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
      dropped++;
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

function hasRealProse(s: Source): boolean {
  const t = (s.snippet || "").trim();
  if (!t || t.startsWith("(no abstract")) return false;
  if (s.provenance.retriever === "methods") return false;
  if (s.kind === "pubmed") return false;
  return t.length >= 60;
}

export function selectEvidence(sources: Source[], cap = MAX_EVIDENCE_FOR_SYNTHESIS): Source[] {
  const rank = (s: Source): number => {
    if (s.kind === "openalex") return hasRealProse(s) ? 3 : 0;
    if (s.kind === "atlas") return 2;
    if (s.kind === "canon") return hasRealProse(s) ? 1 : 0;
    return 0;
  };
  const scored = sources
    .map((s, i) => ({ s, i, r: rank(s) }))
    .sort((a, b) => b.r - a.r || a.i - b.i);

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

export async function runResearchAgent(
  question: string,
  provider: "local" | "anthropic",
): Promise<Brief> {
  const notes: string[] = [];

  const thePlan = await plan(question);

  const { sources, calls, methodMatch } = await retrieve(question, thePlan);

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

  let synth: Awaited<ReturnType<typeof synthesize>>;
  try {
    synth = await synthesize(question, sources);
  } catch (e) {
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

  const { findings, dropped } = validateFindings(synth.out.findings, sources);
  if (dropped > 0) notes.push(`Dropped ${dropped} finding(s) with no valid (retrieved) citation (closed-set citation rule).`);

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
