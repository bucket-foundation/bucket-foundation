/**
 * Research OS for K-12, the grounded-explanation grader shared by the
 * workspace Check tool (POST /api/research-os/workspace action=check) and
 * the diagnostic probe (bkt-ros, Phase 1 item 2). Extracted from
 * src/app/api/research-os/workspace/route.ts's original inline "check" case
 * so the probe route calls the SAME grading code path rather than a second
 * copy of the prompt -- the task's own requirement ("graded by the existing
 * grounded tutor Check action"). Each caller still owns its own stage
 * transition: the workspace route applies onCheckResult
 * (src/lib/research-os/stages.ts), the probe route applies
 * onProbeCheckResult, since a cold-start probe answer and an in-path Check
 * answer mean different things for how far a learner's stage should move.
 *
 * The AI never writes the learner's explanation (S7 "verified in code, not
 * just the prompt" floor, matching /api/academy/tutor): gradeExplanation
 * only ever returns a verdict plus feedback, never a rewritten sentence.
 *
 * ros-14 UPDATE (faded guidance for low-prior-knowledge learners, item 3,
 * "Check prompts adapt"): gradeExplanation takes an optional `guidance`
 * argument. At "high" guidance, with a curated passages.ts entry for this
 * node, the grounding block gains one POINTER line naming the exact
 * passage sentence, and the system prompt gains one matching instruction
 * to reference it in support feedback; every other level (medium, low, or
 * high with no curated passage) omits the pointer entirely, and the
 * grounding block and prompt are byte-identical to the pre-ros-14 shape.
 * This changes ONLY how much the tutor's own feedback text points at --
 * every code-level contract this file already enforces (sanitizeGradeResult's
 * closed result/confidence enums, the single-allowed-citation filter, no
 * field anywhere for a rewritten explanation) is unchanged by guidance
 * level, and holds identically at every level: guidance never widens what
 * a model response is allowed to return, only what one HARD RULE asks the
 * model to reference inside the feedback string it was already allowed to
 * write. See learning/research-os/GUIDANCE.md section 3 and
 * scripts/test-research-os-workspace-contracts.ts's "guidance level" block.
 */
import { callGroundedModelWithUsage, parseModelJson, type Provider, type LlmUsage } from "./llm";
import type { GuidanceLevel, Provenance } from "./types";

export interface GradeResult {
  result: "support" | "contradiction" | "unknown";
  confidence: "high" | "medium" | "low";
  abstained: boolean;
  feedback: string;
  citations: string[];
}

/** gradeExplanation's return, plus the call's token usage (bkt-ros ros-04,
 * "a cost estimate logged per call"): each caller (workspace/route.ts's
 * check action, probe/route.ts) logs its own cost line with its own tool
 * name, rather than this shared module guessing which surface called it. */
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

/** The exact passage this Check call may point to at high guidance: a
 * curated verbatim passage (passages.ts's QuotePassage) with its own
 * locator. Optional; omitted (or `null`, a node with no curated passage
 * yet) means no POINTER block is built regardless of guidance level. */
export interface HighGuidancePassage {
  text: string;
  locator: string;
}

/** Exported for scripts/test-research-os-workspace-contracts.ts's own
 * "guidance level" block: the POINTER line's presence is a pure function
 * of (guidanceLevel, passage), so this is unit-testable with no model call. */
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
  // ros-14 item 3: the pointer only at "high" guidance, and only when a
  // curated passage exists for this node -- a node with no verified
  // passage yet (passages.ts falls back to "summary" for it) gets no
  // POINTER at any guidance level rather than inventing one.
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

/**
 * Contract enforcement for the Check tool's model output (bkt-ros ros-04,
 * "tool contract enforcement server-side"), exported so
 * scripts/test-research-os-workspace-contracts.ts can feed it adversarial
 * model output directly (a jailbroken or malformed response) with no
 * network call. Two invariants this function is the sole enforcer of,
 * regardless of what the system prompt asked for:
 *
 *   1. `citations` never contains anything but the one exact ALLOWED
 *      CITATION string the grounding block gave the model -- a model
 *      that invents a source, or copies a snippet of the grounding text
 *      as a fake citation, has it stripped here, every time.
 *   2. `result`/`confidence` outside their closed enums, or a missing/
 *      non-string `feedback`, is treated as a malformed response and
 *      downgraded to the same abstain verdict an unparseable response
 *      gets (parseModelJson returning null) -- a model cannot escape the
 *      abstain path by returning a well-formed-JSON, wrong-shaped object.
 *
 * Neither this function nor its caller ever reads a "corrected
 * explanation" or "answer" field from the model: GradeResult's type has no
 * such field, so there is nothing for a prompt-injected model response to
 * populate that this code would then surface as the learner's own text.
 * The learner's own text is `explanation`, the caller's own input, never
 * anything this function returns.
 */
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

/**
 * Grade `explanation` against `node`'s own grounding truth (plus its
 * prerequisites' summaries). This is the exact Check tool logic; callers
 * decide what a given result means for stage advancement.
 *
 * `guidanceLevel`/`passage` (ros-14 item 3, optional, both default to
 * omitted/null): at "high" guidance with a curated passage for this node,
 * the grounding block and system prompt gain the POINTER instruction this
 * file's header describes; every other combination leaves the prompt
 * byte-identical to before ros-14. A caller with no guidance concept
 * (probe/route.ts's cold-start grading) can omit both and nothing changes.
 *
 * Throws on a provider call failure (network, auth, rate limit); callers
 * translate that into the appropriate HTTP status, matching the original
 * workspace route's error handling.
 */
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
