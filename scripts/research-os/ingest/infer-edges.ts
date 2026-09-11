/**
 * Research OS for K-12, offline prerequisite-edge inference CLI (bkt-ros
 * ros-03 item 4). Rebuilds the same node population the other two
 * importers already produce (Academy corpus atoms + canon dossier
 * entries), adds the hand-authored Phase 0 seed path, and runs
 * src/lib/research-os/ingest/infer.ts's `inferEdges` over the combined
 * pool: proposes a `prerequisite` edge from lexical overlap of summaries
 * and tier ordering alone, no LLM, no network call.
 *
 * Dry run ONLY: unlike academy-import.ts / canon-import.ts, this script
 * has no `--apply` mode. Every proposal lands on
 * scripts/research-os/ingest/out/review-list.json for a human to confirm
 * (by adding an explicit source-file/seed edge, or a canon-atom-map.json
 * row) or reject; nothing here ever writes to graph.edges.
 *
 * The node-pool assembly (seed plus Academy plus canon) is factored into
 * scripts/research-os/ingest/lib/build-node-pool.ts's `buildNodePool`
 * (bkt-ros ros-13) so infer-edges-llm.ts, the LLM-assisted sibling
 * proposer, scans the exact same population with no second copy of this
 * logic to drift.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/infer-edges.ts
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inferEdges } from "../../../src/lib/research-os/ingest/infer";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import type { ReviewItem } from "../../../src/lib/research-os/ingest/types";
import { buildNodePool } from "./lib/build-node-pool";

const OUT_DIR = join(__dirname, "out");

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

async function main() {
  const { nodes, existingPrerequisitePairs } = buildNodePool();
  const result = inferEdges({ nodes, existingPrerequisitePairs });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "infer-preview.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), scanned_nodes: nodes.length, proposals: result.proposals }, null, 2) + "\n",
  );
  writeReviewList(mergeReviewList(readExistingReviewList(), result.reviewList));

  const examples = result.proposals
    .slice(0, 3)
    .map((p) => `${p.fromSlug} -> ${p.toSlug} (overlap ${p.overlapRatio}, confidence ${p.confidence})`)
    .join("; ");
  console.log(
    `[infer-edges] ${nodes.length} nodes scanned (${new Set(nodes.map((n) => n.branch)).size} branches), ` +
      `${result.proposals.length} proposal(s).` +
      (examples ? ` Examples: ${examples}.` : ""),
  );
  console.log(`[infer-edges] dry run only, no --apply exists for this script. Preview: scripts/research-os/ingest/out/infer-preview.json`);
}

main().catch((err) => {
  console.error("[infer-edges] FAILED:", err.message);
  process.exit(1);
});
