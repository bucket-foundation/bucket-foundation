import type { IngestNodeDraft, ReviewItem } from "../ingest/types";
import { pairKey, type InferredEdgeProposal } from "../ingest/infer";
import { parseModelJson } from "../llm";
import { combineAgreement, type PromptJudgment, type ModelAnswer } from "./calibration";
import { buildPromptA, buildPromptB, promptHash, type EdgeJudgmentPrompt } from "./prompts";

export interface EdgeCandidatePair {
  fromSlug: string;
  toSlug: string;
  fromTitle: string;
  toTitle: string;
  fromSummary: string | null;
  toSummary: string | null;
  branch: string;
  lexicalOverlapRatio: number | null;
}

export const TIER_ADJACENT_MAX_GAP = 1;

export const DEFAULT_TIER_ADJACENT_SAMPLE = 20;

export function sampleTierAdjacentPairs(
  nodes: IngestNodeDraft[],
  existingPrerequisitePairs: Set<string>,
  excludePairs: Set<string>,
  limit: number,
): EdgeCandidatePair[] {
  if (limit <= 0) return [];
  const byBranch = new Map<string, IngestNodeDraft[]>();
  for (const n of nodes) {
    if (!byBranch.has(n.branch)) byBranch.set(n.branch, []);
    byBranch.get(n.branch)!.push(n);
  }

  const candidates: EdgeCandidatePair[] = [];
  byBranch.forEach((branchNodes) => {
    for (const a of branchNodes) {
      for (const b of branchNodes) {
        if (a === b) continue;
        if (b.tier - a.tier < 1 || b.tier - a.tier > TIER_ADJACENT_MAX_GAP) continue;
        const key = pairKey(a.slug, b.slug);
        if (existingPrerequisitePairs.has(key) || excludePairs.has(key)) continue;
        candidates.push({
          fromSlug: a.slug,
          toSlug: b.slug,
          fromTitle: a.title,
          toTitle: b.title,
          fromSummary: a.summary,
          toSummary: b.summary,
          branch: a.branch,
          lexicalOverlapRatio: null,
        });
      }
    }
  });

  candidates.sort((p, q) => p.fromSlug.localeCompare(q.fromSlug) || p.toSlug.localeCompare(q.toSlug));
  return candidates.slice(0, limit);
}

export function buildCandidatePairs(
  nodes: IngestNodeDraft[],
  lexicalProposals: InferredEdgeProposal[],
  existingPrerequisitePairs: Set<string>,
  sampleSize: number = DEFAULT_TIER_ADJACENT_SAMPLE,
): EdgeCandidatePair[] {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const seen = new Set<string>();
  const pairs: EdgeCandidatePair[] = [];
  for (const p of lexicalProposals) {
    const from = bySlug.get(p.fromSlug);
    const to = bySlug.get(p.toSlug);
    if (!from || !to) continue;
    seen.add(pairKey(from.slug, to.slug));
    pairs.push({
      fromSlug: from.slug,
      toSlug: to.slug,
      fromTitle: from.title,
      toTitle: to.title,
      fromSummary: from.summary,
      toSummary: to.summary,
      branch: from.branch,
      lexicalOverlapRatio: p.overlapRatio,
    });
  }
  const sampled = sampleTierAdjacentPairs(nodes, existingPrerequisitePairs, seen, sampleSize);
  return [...pairs, ...sampled];
}

export type ModelCaller = (prompt: EdgeJudgmentPrompt) => Promise<string>;

export function sanitizeJudgment(parsed: { answer?: unknown; justification?: unknown; confidence?: unknown } | null): PromptJudgment {
  const answer: ModelAnswer | null = parsed?.answer === "yes" ? "yes" : parsed?.answer === "no" ? "no" : null;
  const justification = parsed?.justification;
  const confidence = parsed?.confidence;
  const validJustification = typeof justification === "string" && justification.trim() !== "";
  if (!answer || !validJustification || typeof confidence !== "number") {
    return { answer: "no", confidence: 0, justification: "(unparseable or malformed model response, treated as no)" };
  }
  return { answer, confidence, justification };
}

export interface LlmEdgeProposal {
  fromSlug: string;
  toSlug: string;
  branch: string;
  agree: boolean;
  confidence: number;
  confidenceSource: "inferred_llm";
  justification: string;
  secondaryJustification: string;
  model: string;
  promptHash: string;
  secondaryPromptHash: string;
  lexicalOverlapRatio: number | null;
}

export async function judgePair(pair: EdgeCandidatePair, callModel: ModelCaller, model: string): Promise<LlmEdgeProposal | null> {
  const promptInput = { fromTitle: pair.fromTitle, fromSummary: pair.fromSummary, toTitle: pair.toTitle, toSummary: pair.toSummary, branch: pair.branch };
  const promptA = buildPromptA(promptInput);
  const promptB = buildPromptB(promptInput);
  const [rawA, rawB] = await Promise.all([callModel(promptA), callModel(promptB)]);
  const judgmentA = sanitizeJudgment(parseModelJson(rawA));
  const judgmentB = sanitizeJudgment(parseModelJson(rawB));

  const agreement = combineAgreement(judgmentA, judgmentB);
  if (!agreement.proposeEdge) return null;

  return {
    fromSlug: pair.fromSlug,
    toSlug: pair.toSlug,
    branch: pair.branch,
    agree: agreement.agree,
    confidence: agreement.confidence,
    confidenceSource: "inferred_llm",
    justification: judgmentA.justification,
    secondaryJustification: judgmentB.justification,
    model,
    promptHash: promptHash(promptA),
    secondaryPromptHash: promptHash(promptB),
    lexicalOverlapRatio: pair.lexicalOverlapRatio,
  };
}

export interface ProposeLlmEdgesInput {
  pairs: EdgeCandidatePair[];
  callModel: ModelCaller;
  model: string;
}

export interface ProposeLlmEdgesResult {
  proposals: LlmEdgeProposal[];
  reviewList: ReviewItem[];
}

export async function proposeLlmEdges(input: ProposeLlmEdgesInput): Promise<ProposeLlmEdgesResult> {
  const proposals: LlmEdgeProposal[] = [];
  for (const pair of input.pairs) {
    const proposal = await judgePair(pair, input.callModel, input.model);
    if (proposal) proposals.push(proposal);
  }
  proposals.sort((p, q) => p.fromSlug.localeCompare(q.fromSlug) || p.toSlug.localeCompare(q.toSlug));

  const reviewList: ReviewItem[] = proposals.map((p) => ({
    id: `llm_proposed_edge:${p.fromSlug}:${p.toSlug}`,
    kind: "llm_proposed_edge",
    note:
      `${p.model} judged "${p.fromSlug}" a likely prerequisite of "${p.toSlug}" ` +
      `(${p.agree ? "both prompts agreed" : "prompts disagreed, flagged for closer review"}); ` +
      `confidence ${p.confidence}, source inferred_llm. Not written to the graph, a reviewer decides via /research-os/edges.`,
    detail: {
      fromSlug: p.fromSlug,
      toSlug: p.toSlug,
      branch: p.branch,
      confidence: p.confidence,
      confidenceSource: p.confidenceSource,
      agreement: p.agree,
      justification: p.justification,
      secondaryJustification: p.secondaryJustification,
      model: p.model,
      promptHash: p.promptHash,
      secondaryPromptHash: p.secondaryPromptHash,
      lexicalOverlapRatio: p.lexicalOverlapRatio,
    },
  }));

  return { proposals, reviewList };
}
