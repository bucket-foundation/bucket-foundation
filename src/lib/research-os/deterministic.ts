/**
 * Research OS without a model (ros-23). learning/research-os/INTEGRATION-
 * PLAN.md section 5: the first integrated release runs no model behind any
 * tool. Find and Quote were already retrieval; this file gives Check and
 * Organize deterministic paths, and llmEnabled() is the one switch that
 * routes to the model versions instead.
 *
 * Check, deterministic: the learner records their own verdict (support or
 * contradiction) against the passages they quoted, and a rubric grades the
 * attempt on what can be measured without a model: at least one quote is
 * attached, the explanation is in the learner's own words (it is not a
 * copy of a quote), and the explanation draws on the quoted material (term
 * overlap). Confidence follows the rubric. Feedback names what passed and
 * what is missing. The shape matches grounding.ts's GradeResult so every
 * consumer (stages.ts, the workspace page, the evidence log) is unchanged.
 *
 * Organize, deterministic: the learner's own notes split into a claim,
 * evidence points, and sources by sentence and line, nothing added.
 */
import type { GradeResult } from "./grounding";

/** RESEARCH_OS_LLM_ENABLED=1|true turns the model paths on. Default off. */
export function llmEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.RESEARCH_OS_LLM_ENABLED || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type LearnerVerdict = "support" | "contradiction";

export interface QuoteForCheck {
  quotable_span: string | null;
  citation: string;
}

const STOP = new Set(
  "a an the and or but if then than that this these those of to in on at by for from with as is are was were be been being it its into over under about not no yes we you they he she i our your their his her them us me my so such very can could would should may might will shall do does did done have has had having which who whom whose what when where why how all any each more most other some own same too also just only".split(" ")
);

export function terms(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)) {
    if (w.length >= 3 && !STOP.has(w)) out.add(w);
  }
  return out;
}

/** Fraction of the explanation's terms that appear in the quoted text. */
export function overlap(explanation: string, quoted: string): number {
  const e = terms(explanation);
  if (e.size === 0) return 0;
  const q = terms(quoted);
  let hit = 0;
  e.forEach((t) => {
    if (q.has(t)) hit++;
  });
  return hit / e.size;
}

/** True when the explanation is a copy of a quote: a long common run. */
export function isCopy(explanation: string, quotes: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const e = norm(explanation);
  if (e.length < 40) return false;
  for (const q of quotes) {
    const qq = norm(q);
    if (qq.length < 40) continue;
    if (qq.includes(e) || e.includes(qq)) return true;
    // any 60-character window of the explanation found verbatim in a quote
    for (let i = 0; i + 60 <= e.length; i += 20) if (qq.includes(e.slice(i, i + 60))) return true;
  }
  return false;
}

export const MIN_OVERLAP = 0.25;
export const STRONG_OVERLAP = 0.5;

export function deterministicCheck(input: {
  explanation: string;
  quotes: QuoteForCheck[];
  verdict: LearnerVerdict | null | undefined;
}): GradeResult {
  const spans = input.quotes.map((q) => (q.quotable_span || "").trim()).filter(Boolean);
  const citations = Array.from(new Set(input.quotes.map((q) => q.citation).filter(Boolean)));
  const explanation = input.explanation.trim();
  const passed: string[] = [];
  const missing: string[] = [];

  if (spans.length === 0) {
    return {
      result: "unknown",
      confidence: "low",
      abstained: true,
      feedback: "Quote at least one passage first. Check grades your explanation against what you quoted.",
      citations: [],
    };
  }
  passed.push(`${spans.length} quoted passage${spans.length === 1 ? "" : "s"} attached`);

  if (!input.verdict) {
    return {
      result: "unknown",
      confidence: "low",
      abstained: true,
      feedback: "Say whether your quotes support or contradict your explanation, then check again.",
      citations,
    };
  }

  if (explanation.length < 20) missing.push("an explanation of at least a sentence");
  const copy = isCopy(explanation, spans);
  if (copy) missing.push("your own words (the explanation repeats a quote)");
  else if (explanation.length >= 20) passed.push("written in your own words");

  const ov = overlap(explanation, spans.join(" "));
  if (ov >= STRONG_OVERLAP) passed.push("draws on the quoted passages");
  else if (ov >= MIN_OVERLAP) passed.push("touches the quoted passages");
  else missing.push("terms from the passages you quoted");

  const ok = missing.length === 0;
  const confidence: GradeResult["confidence"] = ok && ov >= STRONG_OVERLAP && spans.length >= 2 ? "high" : ok ? "medium" : "low";
  const result: GradeResult["result"] = ok ? input.verdict : "unknown";
  const feedback =
    (ok ? `Recorded as ${input.verdict}. ` : "Not graded yet. ") +
    `Passed: ${passed.join("; ")}.` +
    (missing.length ? ` Missing: ${missing.join("; ")}.` : "") +
    " No model read this; the verdict is yours and the rubric is fixed.";
  return { result, confidence, abstained: !ok, feedback, citations };
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function lines(text: string): string[] {
  const byLine = text
    .split(/\n+|;\s+|\s+[-•*]\s+/)
    .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
  return byLine.length > 1 ? byLine : sentences(text);
}

export interface OrganizeScaffold {
  claim: string;
  evidence: string[];
  sources: string[];
  abstained: boolean;
}

export function deterministicOrganize(input: { claim: string; evidenceNotes: string; sourceNotes: string }): OrganizeScaffold {
  const claim = sentences(input.claim)[0] ?? "";
  const evidence = lines(input.evidenceNotes);
  const sources = lines(input.sourceNotes);
  return { claim, evidence, sources, abstained: false };
}
