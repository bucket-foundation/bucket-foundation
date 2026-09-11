/**
 * Research OS for K-12, LLM-assisted prerequisite-edge inference CLI
 * (bkt-ros ros-13, task item 1). Sibling to infer-edges.ts: scans the same
 * node pool (scripts/research-os/ingest/lib/build-node-pool.ts's
 * `buildNodePool`), but for the harder case that script's own lexical
 * Jaccard-overlap method cannot reach, two nodes with no shared vocabulary
 * at all. Every candidate pair (the lexical proposer's own output, plus a
 * sampled set of tier-adjacent pairs, src/lib/research-os/inference/
 * propose.ts's `buildCandidatePairs`) gets a strict yes-or-no prerequisite
 * judgment from TWO independently-phrased prompts (task item 2's
 * agreement check), using the same grounded call pattern
 * src/lib/research-os/llm.ts already gives the workspace tutor: local
 * OpenAI-compatible LLM default, hosted Anthropic fallback, dark (no
 * proposals, exit 0) when neither is configured.
 *
 * NEVER APPLY, same rule as infer-edges.ts: this script writes no row to
 * graph.edges. Every proposal always lands on
 * scripts/research-os/ingest/out/review-list.json (merged with whatever
 * infer-edges.ts already wrote there). When Supabase IS configured, this
 * script ALSO best-effort-queues each proposal into graph.edge_proposals
 * (status 'pending') so the live /research-os/edges review UI has
 * something to list -- queuing a proposal for human review is not
 * applying an edge; only that UI's approve action
 * (src/lib/research-os/inference/decide.ts) ever writes to graph.edges. A
 * missing Supabase config skips the queue step without failing the run;
 * the file-based review-list.json output is unaffected either way.
 *
 * Deterministic given a deterministic model provider: this CLI's own
 * network call is not deterministic (a real model), but every pure step
 * around it (candidate selection, calibration, agreement combination,
 * review-list assembly) is, and is what
 * scripts/research-os/ingest/test-ingest-infer-llm.ts tests directly with
 * a stubbed `ModelCaller`, no network, no key.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/infer-edges-llm.ts
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inferEdges } from "../../../src/lib/research-os/ingest/infer";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import type { ReviewItem } from "../../../src/lib/research-os/ingest/types";
import { buildNodePool } from "./lib/build-node-pool";
import { buildCandidatePairs, proposeLlmEdges, type ModelCaller, type LlmEdgeProposal } from "../../../src/lib/research-os/inference/propose";
import { callGroundedModelWithUsage, logToolCost, selectProvider, type Provider } from "../../../src/lib/research-os/llm";
import { configured, graphService } from "../../../src/lib/research-os/db";

const OUT_DIR = join(__dirname, "out");
const MAX_JUDGMENT_TOKENS = 300;
// This CLI has no real learner; llm.ts's cost-log function takes a
// learnerId slot for the tutor's own per-learner accounting, this batch
// run logs against a fixed system id instead so the same log line shape
// still carries a cost estimate.
const COST_LOG_ACTOR = "system:infer-edges-llm";

function readExistingReviewList(): ReviewItem[] {
  const p = join(OUT_DIR, "review-list.json");
  if (!existsSync(p)) return [];
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeReviewList(items: ReviewItem[]): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "review-list.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), items }, null, 2) + "\n",
  );
}

/** The model id string recorded on every proposal (task item 1, "model
 * id"). llm.ts has no single exported constant for this across providers
 * (its own MODEL/LLM_MODEL constants are module-private); mirroring its
 * own defaults here rather than exporting them keeps llm.ts untouched. */
function modelIdFor(provider: Provider): string {
  if (provider === "anthropic") return "claude-sonnet-4-5";
  return process.env.LLM_MODEL || "qwen2.5-coder-7b";
}

function makeModelCaller(provider: Exclude<Provider, null>): ModelCaller {
  return async (prompt) => {
    const { text, usage } = await callGroundedModelWithUsage(provider, prompt.system, [{ role: "user", content: prompt.user }], MAX_JUDGMENT_TOKENS);
    logToolCost("research_os.infer_edges_llm", COST_LOG_ACTOR, provider, usage);
    return text;
  };
}

interface EdgeProposalRow {
  from_slug: string;
  to_slug: string;
  branch: string;
  confidence: number;
  confidence_source: string;
  agreement: boolean;
  justification: string;
  secondary_justification: string;
  model: string;
  prompt_hash: string;
  secondary_prompt_hash: string;
}

function toProposalRow(p: LlmEdgeProposal): EdgeProposalRow {
  return {
    from_slug: p.fromSlug,
    to_slug: p.toSlug,
    branch: p.branch,
    confidence: p.confidence,
    confidence_source: p.confidenceSource,
    agreement: p.agree,
    justification: p.justification,
    secondary_justification: p.secondaryJustification,
    model: p.model,
    prompt_hash: p.promptHash,
    secondary_prompt_hash: p.secondaryPromptHash,
  };
}

/** Best-effort queue write: never throws, never blocks the file-based
 * review-list.json output above. `ignoreDuplicates` on the
 * (from_slug, to_slug) unique index means a proposal a reviewer already
 * decided is left untouched by a re-run (the migration's own header). */
async function queueProposals(proposals: LlmEdgeProposal[]): Promise<void> {
  if (!configured()) {
    console.log("[infer-edges-llm] Supabase not configured; skipped queuing to graph.edge_proposals (review-list.json still written).");
    return;
  }
  if (proposals.length === 0) return;
  try {
    const svc = graphService();
    const rows = proposals.map(toProposalRow);
    const { error } = await svc.from("edge_proposals").upsert(rows, { onConflict: "from_slug,to_slug", ignoreDuplicates: true });
    if (error) {
      console.error(`[infer-edges-llm] queue upsert failed (non-fatal, review-list.json is unaffected): ${error.message}`);
      return;
    }
    console.log(`[infer-edges-llm] queued ${rows.length} proposal(s) into graph.edge_proposals for /research-os/edges (already-decided rows left untouched).`);
  } catch (err) {
    console.error(`[infer-edges-llm] queue upsert threw (non-fatal): ${(err as Error).message}`);
  }
}

async function main() {
  const provider = selectProvider();
  if (!provider) {
    console.log("[infer-edges-llm] no LLM provider configured (LLM_BASE_URL / ANTHROPIC_API_KEY unset); nothing to propose. Exiting cleanly.");
    return;
  }

  const { nodes, existingPrerequisitePairs } = buildNodePool();
  const lexical = inferEdges({ nodes, existingPrerequisitePairs });
  const pairs = buildCandidatePairs(nodes, lexical.proposals, existingPrerequisitePairs);

  const model = modelIdFor(provider);
  const result = await proposeLlmEdges({ pairs, callModel: makeModelCaller(provider), model });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "infer-llm-preview.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), scanned_pairs: pairs.length, model, proposals: result.proposals }, null, 2) + "\n",
  );
  writeReviewList(mergeReviewList(readExistingReviewList(), result.reviewList));
  await queueProposals(result.proposals);

  const examples = result.proposals
    .slice(0, 3)
    .map((p) => `${p.fromSlug} -> ${p.toSlug} (${p.agree ? "agree" : "split"}, confidence ${p.confidence})`)
    .join("; ");
  console.log(
    `[infer-edges-llm] ${pairs.length} candidate pair(s) judged with ${model}, ${result.proposals.length} proposal(s).` +
      (examples ? ` Examples: ${examples}.` : ""),
  );
  console.log("[infer-edges-llm] dry run only, no --apply exists for this script. Preview: scripts/research-os/ingest/out/infer-llm-preview.json");
}

main().catch((err) => {
  console.error("[infer-edges-llm] FAILED:", err.message);
  process.exit(1);
});
