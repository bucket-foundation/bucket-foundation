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

export function buildPromptA(input: EdgeJudgmentPromptInput): EdgeJudgmentPrompt {
  return { system: SYSTEM_PROMPT_A, user: userContent(input) };
}

export function buildPromptB(input: EdgeJudgmentPromptInput): EdgeJudgmentPrompt {
  return { system: SYSTEM_PROMPT_B, user: userContent(input) };
}

export function promptHash(prompt: EdgeJudgmentPrompt): string {
  return createHash("sha256").update(`${prompt.system}\n---\n${prompt.user}`, "utf8").digest("hex").slice(0, 16);
}
