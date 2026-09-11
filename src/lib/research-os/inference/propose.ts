/**
 * Research OS for K-12, LLM-assisted edge inference: candidate-pair
 * selection and the model-judged proposal pipeline (bkt-ros ros-13, task
 * item 1). Sibling to src/lib/research-os/ingest/infer.ts: this module
 * proposes the SAME kind of edge (a `prerequisite` edge between two
 * existing nodes, never applied, always landing on the review list), for
 * the harder case that module's own header names as unaddressed: "an edge
 * between two nodes with no lexical or structural signal at all"
 * (learning/research-os/INGESTION.md, "What this slice does not do").
 *
 * DEPENDENCY INJECTION: `judgePair` and `proposeLlmEdges` take a
 * `ModelCaller` function rather than calling
 * src/lib/research-os/llm.ts's `callGroundedModelWithUsage` directly. The
 * CLI wrapper (scripts/research-os/ingest/infer-edges-llm.ts) wires the
 * real provider (llm.ts's `selectProvider` + `callGroundedModelWithUsage`,
 * "the same grounded call pattern as the tutor" the task brief names);
 * scripts/research-os/ingest/test-ingest-infer-llm.ts wires a stub that
 * returns fixed JSON strings with no network call and no API key, so this
 * module's own tests are deterministic and offline, matching every other
 * research-os test in this repo.
 */
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
  /** Set when this pair also surfaced from infer.ts's lexical proposer;
   * null for a pair reached only through tier-adjacent sampling below,
   * with no lexical overlap signal at all. Carried through to the review
   * list purely as context for a human reviewer, never read by any
   * calibration logic here. */
  lexicalOverlapRatio: number | null;
}

/** Tier-adjacent, task item 1's "optionally a sampled set of tier-adjacent
 * pairs": a candidate whose two nodes sit exactly this many tiers apart or
 * closer, same branch, with no existing or lexically-proposed edge
 * between them. 1 (strictly adjacent tiers) keeps the sampled pool to
 * curriculum-neighboring pairs, the population most likely to hide a real
 * prerequisite the lexical proposer's Jaccard-overlap method missed for
 * having no shared vocabulary, rather than every possible easier/harder
 * pair in a branch (combinatorial, and mostly unrelated at a wide tier
 * gap). */
export const TIER_ADJACENT_MAX_GAP = 1;

/** Default cap on how many tier-adjacent pairs one run samples, keeping a
 * single CLI invocation's model-call count (2 calls per pair, task item 2's
 * agreement check) bounded regardless of graph size. Liang et al. 2018
 * (_intake/research-os-k12-literature/prerequisite-knowledge-graphs/
 * liang-et-al-2018-active-learning-concept-prerequisite.md) finds an
 * uncertainty-ranked labeling queue beats a random one under a fixed
 * budget; this module samples deterministically by sorted slug rather than
 * by uncertainty, a Phase 1 floor -- ranking the sample by an uncertainty
 * signal is real follow-up work once a live graph's own candidate pool is
 * large enough for the difference to matter. */
export const DEFAULT_TIER_ADJACENT_SAMPLE = 20;

/**
 * Every same-branch, tier-adjacent pair not already a `prerequisite` edge
 * and not already in `excludePairs` (the lexical proposer's own output,
 * so the two proposers never re-judge the same pair). Deterministic:
 * candidates sort by (fromSlug, toSlug) before truncating to `limit`, so
 * the same node pool always samples the same pairs.
 */
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

/**
 * The full candidate pool for one LLM-inference run: every pair the
 * lexical proposer already surfaced (infer.ts's `inferEdges` output,
 * `lexicalOverlapRatio` carried through), plus up to `sampleSize`
 * tier-adjacent pairs the lexical proposer did not surface. A pair already
 * covered by a real edge (seed, Academy, canon, or an earlier accepted
 * inference) is never included, matching infer.ts's own
 * `existingPrerequisitePairs` contract.
 */
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
    if (!from || !to) continue; // defensive: the proposal came from this same node pool
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

/**
 * A raw model response downgraded to a safe "no" judgment on ANY
 * malformed shape (missing/wrong-typed field, an answer outside
 * yes/no, unparseable JSON): matching grounding.ts's `sanitizeGradeResult`
 * fail-safe posture (S7, "verified in code, not just the prompt"). A "no"
 * default rather than a thrown error means one bad response never crashes
 * a whole batch run, and it reads naturally through combineAgreement: a
 * malformed response paired with a real "yes" becomes a disagreement
 * (flagged, sub-threshold confidence) rather than a silent drop or a
 * confident-looking accident.
 */
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

/**
 * Judges one candidate pair with both prompt phrasings (task item 2), runs
 * them through calibration.ts's `combineAgreement`, and returns the
 * assembled proposal, or null when both phrasings answered "no" (nothing
 * to propose). The two calls run concurrently: they are independent, and
 * ordering has no effect on the result (`combineAgreement` is symmetric in
 * its own reading of "both yes" / "both no" / split).
 */
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
  /** The model id string recorded on every proposal (task item 1, "model
   * id"). llm.ts has no single exported constant for this (it varies by
   * provider), so the caller supplies it -- the CLI wrapper reads it off
   * whichever provider `selectProvider()` picked. */
  model: string;
}

export interface ProposeLlmEdgesResult {
  proposals: LlmEdgeProposal[];
  reviewList: ReviewItem[];
}

/**
 * Runs `judgePair` over every candidate pair IN SEQUENCE (not
 * Promise.all across the whole batch): a live run against a rate-limited
 * or metered provider should not fan out one request per pair at once,
 * matching llm.ts's own one-call-at-a-time callers elsewhere in this
 * package. Deterministic given a deterministic `callModel` stub, per task
 * item 1: the same pairs and the same stub always produce the same
 * proposals and reviewList, in the same (fromSlug, toSlug)-sorted order,
 * regardless of `pairs`' own input order.
 */
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
