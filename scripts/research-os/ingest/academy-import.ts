import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildAcademyImport } from "../../../src/lib/research-os/ingest/academy";
import { checkOrphanEdges, checkTierMonotonicity, tierViolationsToReviewItems } from "../../../src/lib/research-os/ingest/validate";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";
import { readExistingReviewList, writeReviewList } from "./lib/review-list";
import { upsertGraph } from "./lib/upsert-graph";
import { shadowRequested, shadowWrite } from "./lib/medallion-shadow";

const ROOT = resolve(__dirname, "..", "..", "..");
const OUT_DIR = join(__dirname, "out");
const APPLY = process.argv.includes("--apply");

async function main() {
  const files = loadAcademyCorpusFiles(ROOT);
  const result = buildAcademyImport(files);

  const orphans = checkOrphanEdges(result.nodes, result.edges);
  if (orphans.length > 0) {
    throw new Error(`academy-import: ${orphans.length} orphan edge(s) produced, e.g. ${orphans[0].fromSlug} -> ${orphans[0].toSlug}`);
  }
  const tierViolations = checkTierMonotonicity(result.nodes, result.edges);
  const reviewList = [...result.reviewList, ...tierViolationsToReviewItems(tierViolations)];

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "academy-preview.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), stats: result.stats, nodes: result.nodes, edges: result.edges }, null, 2) + "\n",
  );
  writeReviewList(mergeReviewList(readExistingReviewList(), reviewList));

  console.log(
    `[academy-import] ${files.length} corpus files, ${result.nodes.length} nodes, ${result.edges.length} prerequisite edges, ` +
      `${tierViolations.length} tier violations, ${result.reviewList.length} other review items.`,
  );

  if (!APPLY) {
    console.log(`[academy-import] dry run only. Preview: scripts/research-os/ingest/out/academy-preview.json`);
  } else {
    const written = await upsertGraph(result.nodes, result.edges, { label: "academy-import" });
    console.log(`[academy-import] wrote ${written.nodesWritten} nodes, ${written.edgesWritten} edges to graph schema.`);
  }
  if (shadowRequested()) await shadowWrite("academy-import", result.nodes);
}

main().catch((err) => {
  console.error("[academy-import] FAILED:", err.message);
  process.exit(1);
});
