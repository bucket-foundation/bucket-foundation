/**
 * Research OS for K-12, LLM-assisted edge inference: the two independently-
 * phrased prompts task item 2's agreement check runs per candidate pair
 * (bkt-ros ros-13). Both ask the same strict yes-or-no prerequisite
 * question the task brief names ("ask the model a strict yes or no with a
 * one-sentence justification and a self-reported confidence"); the second
 * phrasing exists ONLY so two runs of the same underlying judgment can
 * disagree when the pair is ambiguous (calibration.ts's
 * `combineAgreement`), the same disagreement-as-signal reading Alzetta et
 * al. 2018 supplies for human annotators on comparable material (see
 * calibration.ts's header). Neither prompt ever asks the model to write or
 * rewrite anything a learner would see: this module's whole output is a
 * yes/no/justification/confidence judgment about two EXISTING node
 * summaries, matching the same "never let the model write the learner-
 * facing artifact" floor grounding.ts's CHECK_SYSTEM_PROMPT documents for
 * the workspace tutor.
 */
import { createHash } from "node:crypto";

export interface EdgeJudgmentPromptInput {
  fromTitle: string;
  fromSummary: string | null;
  toTitle: string;
  toSummary: string | null;
  branch: string;
}

export interface EdgeJudgmentPrompt {
  system: string;
  user: string;
}

const RESPONSE_CONTRACT = `Respond with ONLY a JSON object, no markdown fences:
{"answer": "yes"|"no", "justification": string, "confidence": number}

"answer" is "yes" only if understanding the FIRST concept is ordinarily necessary before understanding the SECOND concept within this branch's own curriculum. "justification" is exactly one sentence. "confidence" is your own self-reported certainty in the answer, a number from 0 (a guess) to 1 (certain).`;

const SYSTEM_PROMPT_A = `You are a curriculum reviewer for Bucket's Research OS. You judge whether one concept is a PREREQUISITE of another -- never whether they are merely related or co-occur in the same unit. A shared topic or vocabulary is not enough; the question is whether a learner needs the first concept to make sense of the second.

${RESPONSE_CONTRACT}`;

// A distinct phrasing of the same question (task item 2's "two independent
// prompts, different phrasings"): different framing ("build on" rather than
// "necessary before"), different emphasis (explicitly warns against the
// same-section co-occurrence conflation Alzetta et al. 2018 names), so a
// pair the first prompt gets right on lexical similarity alone still has a
// second, differently-worded chance to catch a shared-vocabulary false
// positive.
const SYSTEM_PROMPT_B = `You review candidate prerequisite links in a K-12 and canon knowledge graph. Two concepts can share vocabulary or appear in the same unit WITHOUT one being a prerequisite of the other -- that conflation is a documented failure mode of automated prerequisite detection. Judge only: would a learner need to already grasp the FIRST concept to build real understanding of the SECOND, not just to recognize related words.

${RESPONSE_CONTRACT}`;

function userContent(input: EdgeJudgmentPromptInput): string {
  return [
    `BRANCH: ${input.branch}`,
    `FIRST CONCEPT: ${input.fromTitle}`,
    `FIRST CONCEPT SUMMARY: ${input.fromSummary ?? "(no summary)"}`,
    `SECOND CONCEPT: ${input.toTitle}`,
    `SECOND CONCEPT SUMMARY: ${input.toSummary ?? "(no summary)"}`,
  ].join("\n");
}

/** Phrasing A: "necessary before." */
export function buildPromptA(input: EdgeJudgmentPromptInput): EdgeJudgmentPrompt {
  return { system: SYSTEM_PROMPT_A, user: userContent(input) };
}

/** Phrasing B: "build on," with an explicit co-occurrence warning. */
export function buildPromptB(input: EdgeJudgmentPromptInput): EdgeJudgmentPrompt {
  return { system: SYSTEM_PROMPT_B, user: userContent(input) };
}

/**
 * A stable, short identifier for one exact (system, user) prompt pair
 * (task item 1's "prompt hash"), so a review-list row names which prompt
 * text produced a given judgment without embedding the full prompt in
 * every row. Deterministic and pure: the same prompt text always hashes
 * identically, matching this module's "deterministic given the stub"
 * requirement. sha256 over plain UTF-8 text, truncated to 16 hex chars --
 * long enough that two different prompts never collide in practice, short
 * enough to stay a readable id in a review-list.json row or a UI table
 * cell.
 */
export function promptHash(prompt: EdgeJudgmentPrompt): string {
  return createHash("sha256").update(`${prompt.system}\n---\n${prompt.user}`, "utf8").digest("hex").slice(0, 16);
}
