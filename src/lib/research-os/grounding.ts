import { callGroundedModelWithUsage, parseModelJson, type Provider, type LlmUsage } from "./llm";
import type { GuidanceLevel, Provenance } from "./types";

export interface GradeResult {
  result: "support" | "contradiction" | "unknown";
  confidence: "high" | "medium" | "low";
  abstained: boolean;
  feedback: string;
  citations: string[];
}

export interface GradeResultWithUsage extends GradeResult {
  usage: LlmUsage | null;
}

export interface GroundingNode {
  title: string;
  summary: string | null;
  provenance?: Provenance;
}

const MAX_CHECK_TOKENS = 500;

export function citationLabel(node: { title: string; provenance?: Provenance }): string {
  const p = node.provenance;
  if (!p) return node.title;
  const who = p.author ? `${p.author}` : p.publisher || "";
  const when = p.year ? ` (${p.year})` : "";
  const what = p.title ? `. ${p.title}.` : "";
  return `${who}${when}${what}`.trim() || node.title;
}

export interface HighGuidancePassage {
  text: string;
  locator: string;
}

export function buildGrounding(
  node: GroundingNode,
  prereqSummaries: Array<{ title: string; summary: string | null }>,
  allowLabel: string,
  guidanceLevel?: GuidanceLevel,
  passage?: HighGuidancePassage | null,
): string {
  const lines = [
    `CONCEPT: ${node.title}`,
    `GROUNDING TRUTH: ${node.summary}`,
    ...prereqSummaries.map((p) => `PREREQUISITE (already covered): ${p.title} -- ${p.summary}`),
    `ALLOWED CITATION (copy verbatim if you cite anything, cite nothing else): "${allowLabel}"`,
  ];
  if (guidanceLevel === "high" && passage) {
    lines.push(`POINTER (high guidance only): the exact passage sentence to name in your feedback is "${passage.text}" (${passage.locator}).`);
  }
  return lines.join("\n\n");
}

const CHECK_SYSTEM_PROMPT = `You are the Check tool in Bucket's Research OS workspace. You NEVER write or correct the learner's explanation, you only judge it against the GROUNDING.

HARD RULES:
1. Judge ONLY against the GROUNDING TRUTH and its listed PREREQUISITEs. Never use outside knowledge to decide the verdict.
2. If the explanation is unrelated to the grounding or you cannot judge it from the grounding, set "abstained": true and "result": "unknown".
3. "result" is "support" (the explanation is consistent with and grounded in the material), "contradiction" (it conflicts with the material), or "unknown" (not enough to tell).
4. NEVER rewrite the learner's explanation. Return a short "feedback" string: if support, name what makes it grounded; if contradiction or unknown, ask ONE guiding question or name what part of the grounding to revisit -- never supply the corrected sentence.
5. Cite only the exact ALLOWED CITATION string if you reference the source, and only if you leaned on it. Empty citations array if not.
6. "confidence" is "high" only when the grounding directly and fully settles the verdict; "medium" partial; "low" when stretching (consider abstaining instead).
7. When a POINTER line is present in the grounding below, and your verdict is "support," name the exact sentence it quotes inside your "feedback" string, so the learner can go check it themselves. When no POINTER line is present, give feedback with no reference to any specific passage sentence.

Respond with ONLY a JSON object, no markdown fences:
{"result": "support"|"contradiction"|"unknown", "confidence": "high"|"medium"|"low", "abstained": boolean, "feedback": string, "citations": string[]}`;

const VALID_RESULTS = new Set(["support", "contradiction", "unknown"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);

const ABSTAIN_FALLBACK: GradeResult = {
  result: "unknown",
  confidence: "low",
  abstained: true,
  feedback: "I had trouble grounding a verdict. Try rephrasing your explanation.",
  citations: [],
};

export function sanitizeGradeResult(parsed: GradeResult | null, allowLabel: string): GradeResult {
  if (!parsed || !VALID_RESULTS.has(parsed.result) || !VALID_CONFIDENCE.has(parsed.confidence) || typeof parsed.feedback !== "string") {
    return { ...ABSTAIN_FALLBACK };
  }
  return {
    result: parsed.result,
    confidence: parsed.confidence,
    abstained: Boolean(parsed.abstained),
    feedback: parsed.feedback,
    citations: (parsed.citations || []).filter((c) => typeof c === "string" && c.trim() === allowLabel),
  };
}

export async function gradeExplanation(
  provider: Provider,
  node: GroundingNode,
  prereqSummaries: Array<{ title: string; summary: string | null }>,
  explanation: string,
  guidanceLevel?: GuidanceLevel,
  passage?: HighGuidancePassage | null,
): Promise<GradeResultWithUsage> {
  const allowLabel = citationLabel(node);
  const grounding = buildGrounding(node, prereqSummaries, allowLabel, guidanceLevel, passage);

  const { text, usage } = await callGroundedModelWithUsage(
    provider,
    CHECK_SYSTEM_PROMPT,
    [{ role: "user", content: `${grounding}\n\n---\nLEARNER'S EXPLANATION: ${explanation}` }],
    MAX_CHECK_TOKENS,
  );

  const safe = sanitizeGradeResult(parseModelJson<GradeResult>(text), allowLabel);
  return { ...safe, usage };
}
