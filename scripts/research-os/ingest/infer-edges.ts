import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { inferEdges } from "../../../src/lib/research-os/ingest/infer";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import { buildNodePool } from "./lib/build-node-pool";
import { readExistingReviewList, writeReviewList } from "./lib/review-list";

const OUT_DIR = join(__dirname, "out");

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
