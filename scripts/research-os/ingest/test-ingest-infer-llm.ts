/**
 * Unit tests: src/lib/research-os/inference/{calibration,prompts,propose}.ts,
 * the LLM-assisted prerequisite-edge proposer (bkt-ros ros-13, task items 1
 * and 2). Every model call goes through a stubbed `ModelCaller`, no
 * network, no key, matching this repo's existing offline research-os test
 * convention (scripts/research-os/ingest/test-ingest-infer.ts is the exact
 * sibling for the lexical proposer this module extends).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/test-ingest-infer-llm.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  llmSelfReportedToConfidence,
  combineAgreement,
  DISAGREEMENT_CONFIDENCE,
  INFERRED_CONFIDENCE_MIN,
  INFERRED_CONFIDENCE_MAX,
  type PromptJudgment,
} from "../../../src/lib/research-os/inference/calibration";
import { buildPromptA, buildPromptB, promptHash } from "../../../src/lib/research-os/inference/prompts";
import {
  buildCandidatePairs,
  sampleTierAdjacentPairs,
  sanitizeJudgment,
  judgePair,
  proposeLlmEdges,
  TIER_ADJACENT_MAX_GAP,
  type EdgeCandidatePair,
  type ModelCaller,
} from "../../../src/lib/research-os/inference/propose";
import { LOW_CONFIDENCE_THRESHOLD } from "../../../src/lib/research-os/types";
import type { IngestNodeDraft } from "../../../src/lib/research-os/ingest/types";
import type { InferredEdgeProposal } from "../../../src/lib/research-os/ingest/infer";

function node(slug: string, tier: number, summary: string | null, branch = "02-physics"): IngestNodeDraft {
  return { slug, title: slug, kind: "concept", tier, branch, summary, labels: { en: { title: slug } }, provenance: {} };
}

function judgment(answer: "yes" | "no", confidence: number, justification = "because"): PromptJudgment {
  return { answer, confidence, justification };
}

// ---------------------------------------------------------------------------
// calibration.ts: llmSelfReportedToConfidence
// ---------------------------------------------------------------------------

test("llmSelfReportedToConfidence: bounded in [INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX], monotonic", () => {
  const low = llmSelfReportedToConfidence(0);
  const mid = llmSelfReportedToConfidence(0.5);
  const high = llmSelfReportedToConfidence(1);
  assert.equal(low, INFERRED_CONFIDENCE_MIN);
  assert.equal(high, INFERRED_CONFIDENCE_MAX);
  assert.ok(low <= mid && mid <= high, "confidence must rise with self-reported confidence");
  assert.ok(high < 0.9, "an LLM-inferred proposal must never reach canon_map's own 0.9 confidence");
});

test("llmSelfReportedToConfidence: clamps out-of-range or non-finite input rather than propagating it", () => {
  assert.equal(llmSelfReportedToConfidence(-5), INFERRED_CONFIDENCE_MIN);
  assert.equal(llmSelfReportedToConfidence(5), INFERRED_CONFIDENCE_MAX);
  assert.equal(llmSelfReportedToConfidence(NaN), INFERRED_CONFIDENCE_MIN);
});

// ---------------------------------------------------------------------------
// calibration.ts: combineAgreement
// ---------------------------------------------------------------------------

test("combineAgreement: both prompts say no -> nothing proposed", () => {
  const result = combineAgreement(judgment("no", 0.9), judgment("no", 0.8));
  assert.equal(result.proposeEdge, false);
});

test("combineAgreement: both prompts say yes -> agree, confidence is the lower of the two shrunk self-reports", () => {
  const result = combineAgreement(judgment("yes", 0.9), judgment("yes", 0.4));
  assert.equal(result.agree, true);
  assert.equal(result.proposeEdge, true);
  assert.equal(result.confidence, llmSelfReportedToConfidence(0.4), "the weaker phrasing's confidence wins, not an average");
  assert.ok(result.confidence <= INFERRED_CONFIDENCE_MAX);
});

test("combineAgreement: a disagreeing pair (one yes, one no) still proposes an edge, flagged below the teacher threshold", () => {
  const result = combineAgreement(judgment("yes", 0.95), judgment("no", 0.95));
  assert.equal(result.agree, false);
  assert.equal(result.proposeEdge, true, "a split verdict is surfaced for review, never silently dropped");
  assert.equal(result.confidence, DISAGREEMENT_CONFIDENCE);
  assert.ok(result.confidence < LOW_CONFIDENCE_THRESHOLD, "a disagreeing pair must land below the 0.6 teacher-flag threshold");
});

test("combineAgreement: disagreement in the other direction (no, then yes) is symmetric", () => {
  const result = combineAgreement(judgment("no", 0.2), judgment("yes", 0.2));
  assert.equal(result.agree, false);
  assert.equal(result.proposeEdge, true);
  assert.equal(result.confidence, DISAGREEMENT_CONFIDENCE);
});

// ---------------------------------------------------------------------------
// prompts.ts
// ---------------------------------------------------------------------------

const PROMPT_INPUT = {
  fromTitle: "Wavefunction",
  fromSummary: "Describes a quantum system's probability amplitude.",
  toTitle: "Uncertainty principle",
  toSummary: "Bounds joint measurement precision.",
  branch: "02-physics",
};

test("buildPromptA / buildPromptB: two distinct phrasings of the same question", () => {
  const a = buildPromptA(PROMPT_INPUT);
  const b = buildPromptB(PROMPT_INPUT);
  assert.notEqual(a.system, b.system, "the two prompts must be worded differently");
  assert.match(a.system, /prerequisite/i);
  assert.match(b.system, /prerequisite/i);
  assert.equal(a.user, b.user, "both phrasings judge the exact same candidate pair content");
});

test("promptHash: deterministic for identical prompt text, distinct for different text", () => {
  const a = buildPromptA(PROMPT_INPUT);
  const again = buildPromptA(PROMPT_INPUT);
  const b = buildPromptB(PROMPT_INPUT);
  assert.equal(promptHash(a), promptHash(again));
  assert.notEqual(promptHash(a), promptHash(b));
  assert.equal(promptHash(a).length, 16);
});

// ---------------------------------------------------------------------------
// propose.ts: sanitizeJudgment
// ---------------------------------------------------------------------------

test("sanitizeJudgment: a well-formed yes/no response passes through unchanged", () => {
  const parsed = { answer: "yes", justification: "X is used to define Y.", confidence: 0.7 };
  assert.deepEqual(sanitizeJudgment(parsed), { answer: "yes", justification: "X is used to define Y.", confidence: 0.7 });
});

test("sanitizeJudgment: null, missing fields, wrong types, or an answer outside yes/no all downgrade to a safe 'no'", () => {
  const fallback = { answer: "no", confidence: 0, justification: "(unparseable or malformed model response, treated as no)" };
  assert.deepEqual(sanitizeJudgment(null), fallback);
  assert.deepEqual(sanitizeJudgment({}), fallback);
  assert.deepEqual(sanitizeJudgment({ answer: "maybe", justification: "x", confidence: 0.5 }), fallback);
  assert.deepEqual(sanitizeJudgment({ answer: "yes", justification: "", confidence: 0.5 }), fallback, "an empty justification is malformed");
  assert.deepEqual(sanitizeJudgment({ answer: "yes", justification: "x", confidence: "high" as unknown as number }), fallback);
});

// ---------------------------------------------------------------------------
// propose.ts: sampleTierAdjacentPairs
// ---------------------------------------------------------------------------

test("sampleTierAdjacentPairs: only exactly-adjacent tiers within a branch are candidates", () => {
  const nodes = [node("a", 1, "s"), node("b", 2, "s"), node("c", 4, "s")];
  const pairs = sampleTierAdjacentPairs(nodes, new Set(), new Set(), 10);
  assert.deepEqual(
    pairs.map((p) => [p.fromSlug, p.toSlug]),
    [["a", "b"]],
    "a-b is tier-adjacent (gap 1); b-c (gap 2) and a-c (gap 3) exceed TIER_ADJACENT_MAX_GAP",
  );
  assert.equal(TIER_ADJACENT_MAX_GAP, 1);
});

test("sampleTierAdjacentPairs: excludes an existing prerequisite pair and an already lexically-proposed pair", () => {
  const nodes = [node("a", 1, "s"), node("b", 2, "s"), node("c", 5, "s"), node("d", 6, "s")];
  const pairs = sampleTierAdjacentPairs(nodes, new Set(["a|b"]), new Set(["c|d"]), 10);
  assert.deepEqual(pairs, []);
});

test("sampleTierAdjacentPairs: never crosses branches", () => {
  const nodes = [node("a", 1, "s", "02-physics"), node("b", 2, "s", "07-mind")];
  assert.deepEqual(sampleTierAdjacentPairs(nodes, new Set(), new Set(), 10), []);
});

test("sampleTierAdjacentPairs: deterministic ordering and respects a limit", () => {
  const nodes = [node("z", 1, "s"), node("z2", 2, "s"), node("a", 1, "s"), node("a2", 2, "s")];
  const once = sampleTierAdjacentPairs(nodes, new Set(), new Set(), 1);
  const twice = sampleTierAdjacentPairs(nodes, new Set(), new Set(), 1);
  assert.deepEqual(once, twice);
  assert.equal(once.length, 1);
  assert.equal(once[0].fromSlug, "a", "sorted by (fromSlug, toSlug) before truncating");
});

// ---------------------------------------------------------------------------
// propose.ts: buildCandidatePairs
// ---------------------------------------------------------------------------

test("buildCandidatePairs: carries the lexical proposer's own overlapRatio through, and adds sampled pairs with null overlap", () => {
  const nodes = [node("a", 1, "alpha"), node("b", 2, "beta")];
  const lexical: InferredEdgeProposal[] = [{ fromSlug: "a", toSlug: "b", overlapRatio: 0.42, confidence: 0.5 }];
  const pairs = buildCandidatePairs(nodes, lexical, new Set(), 5);
  assert.equal(pairs.length, 1, "a-b is both lexically proposed and tier-adjacent; it must not appear twice");
  assert.equal(pairs[0].lexicalOverlapRatio, 0.42);
});

test("buildCandidatePairs: sampleSize 0 disables tier-adjacent sampling, lexical proposals still included", () => {
  const nodes = [node("a", 1, "alpha"), node("b", 2, "beta"), node("c", 3, "gamma")];
  const lexical: InferredEdgeProposal[] = [{ fromSlug: "a", toSlug: "b", overlapRatio: 0.5, confidence: 0.5 }];
  const pairs = buildCandidatePairs(nodes, lexical, new Set(), 0);
  assert.deepEqual(pairs.map((p) => [p.fromSlug, p.toSlug]), [["a", "b"]]);
});

// ---------------------------------------------------------------------------
// propose.ts: judgePair / proposeLlmEdges (stubbed model, no network)
// ---------------------------------------------------------------------------

const PAIR: EdgeCandidatePair = {
  fromSlug: "wavefunction",
  toSlug: "uncertainty",
  fromTitle: "Wavefunction",
  toTitle: "Uncertainty principle",
  fromSummary: "Describes a quantum system's probability amplitude.",
  toSummary: "Bounds joint measurement precision.",
  branch: "02-physics",
  lexicalOverlapRatio: null,
};

function stubCaller(responses: Record<string, string>): ModelCaller {
  return async (prompt) => {
    const key = prompt.system.includes("build real understanding") ? "B" : "A";
    return responses[key];
  };
}

test("judgePair: both prompts agree yes -> a proposal with agree true and a shrunk confidence", async () => {
  const caller = stubCaller({
    A: JSON.stringify({ answer: "yes", justification: "Wavefunctions ground uncertainty bounds.", confidence: 0.9 }),
    B: JSON.stringify({ answer: "yes", justification: "Uncertainty is derived from the wavefunction formalism.", confidence: 0.6 }),
  });
  const proposal = await judgePair(PAIR, caller, "test-model");
  assert.ok(proposal);
  assert.equal(proposal!.agree, true);
  assert.equal(proposal!.confidence, llmSelfReportedToConfidence(0.6));
  assert.equal(proposal!.confidenceSource, "inferred_llm");
  assert.equal(proposal!.model, "test-model");
  assert.equal(proposal!.promptHash.length, 16);
  assert.notEqual(proposal!.promptHash, proposal!.secondaryPromptHash);
});

test("judgePair: both prompts agree no -> null, nothing proposed", async () => {
  const caller = stubCaller({
    A: JSON.stringify({ answer: "no", justification: "Unrelated concepts.", confidence: 0.9 }),
    B: JSON.stringify({ answer: "no", justification: "No dependency either way.", confidence: 0.9 }),
  });
  assert.equal(await judgePair(PAIR, caller, "test-model"), null);
});

test("judgePair: a disagreeing pair still returns a proposal, flagged below the teacher threshold", async () => {
  const caller = stubCaller({
    A: JSON.stringify({ answer: "yes", justification: "Order matches the syllabus.", confidence: 0.8 }),
    B: JSON.stringify({ answer: "no", justification: "Co-occurrence only, not a real dependency.", confidence: 0.8 }),
  });
  const proposal = await judgePair(PAIR, caller, "test-model");
  assert.ok(proposal);
  assert.equal(proposal!.agree, false);
  assert.equal(proposal!.confidence, DISAGREEMENT_CONFIDENCE);
  assert.ok(proposal!.confidence < LOW_CONFIDENCE_THRESHOLD, "task item 2: a disagreeing pair must land flagged");
});

test("judgePair: an unparseable response from one prompt is treated as a safe no, not a crash", async () => {
  const caller = stubCaller({
    A: "not json at all",
    B: JSON.stringify({ answer: "yes", justification: "Real dependency.", confidence: 0.9 }),
  });
  const proposal = await judgePair(PAIR, caller, "test-model");
  assert.ok(proposal, "A's malformed response reads as 'no', B says 'yes': a disagreement, still proposed");
  assert.equal(proposal!.agree, false);
  assert.equal(proposal!.confidence, DISAGREEMENT_CONFIDENCE);
});

test("proposeLlmEdges: deterministic given a deterministic stub, sorted by (fromSlug, toSlug)", async () => {
  const pairs: EdgeCandidatePair[] = [
    { ...PAIR, fromSlug: "z-node", toSlug: "y-node" },
    { ...PAIR, fromSlug: "a-node", toSlug: "b-node" },
  ];
  const caller = stubCaller({
    A: JSON.stringify({ answer: "yes", justification: "Necessary first.", confidence: 0.8 }),
    B: JSON.stringify({ answer: "yes", justification: "Builds on it.", confidence: 0.8 }),
  });
  const once = await proposeLlmEdges({ pairs, callModel: caller, model: "test-model" });
  const twice = await proposeLlmEdges({ pairs, callModel: caller, model: "test-model" });
  assert.deepEqual(once, twice, "identical input and a deterministic stub must produce identical output");
  assert.deepEqual(
    once.proposals.map((p) => p.fromSlug),
    ["a-node", "z-node"],
    "sorted by fromSlug regardless of input order",
  );
});

test("proposeLlmEdges: every proposal produces a stable-id llm_proposed_edge review item carrying confidence_source, justification, model, and prompt hash", async () => {
  const caller = stubCaller({
    A: JSON.stringify({ answer: "yes", justification: "Necessary first.", confidence: 0.8 }),
    B: JSON.stringify({ answer: "yes", justification: "Builds on it.", confidence: 0.8 }),
  });
  const { reviewList } = await proposeLlmEdges({ pairs: [PAIR], callModel: caller, model: "test-model" });
  assert.equal(reviewList.length, 1);
  const item = reviewList[0];
  assert.equal(item.kind, "llm_proposed_edge");
  assert.equal(item.id, `llm_proposed_edge:${PAIR.fromSlug}:${PAIR.toSlug}`);
  assert.equal(item.detail.confidenceSource, "inferred_llm");
  assert.equal(item.detail.justification, "Necessary first.");
  assert.equal(item.detail.model, "test-model");
  assert.equal(typeof item.detail.promptHash, "string");
  assert.match(item.note, /Not written to the graph/);
});

test("proposeLlmEdges: a pair where both prompts say no never reaches the review list", async () => {
  const caller = stubCaller({
    A: JSON.stringify({ answer: "no", justification: "Unrelated.", confidence: 0.9 }),
    B: JSON.stringify({ answer: "no", justification: "Unrelated.", confidence: 0.9 }),
  });
  const { proposals, reviewList } = await proposeLlmEdges({ pairs: [PAIR], callModel: caller, model: "test-model" });
  assert.deepEqual(proposals, []);
  assert.deepEqual(reviewList, []);
});
