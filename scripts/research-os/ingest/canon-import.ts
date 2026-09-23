import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPrimaryPapers, authorsShort, type PrimaryPaper } from "../../../src/lib/canon-primary";
import { buildCanonImport, type AcademyAtomRef, type CanonAtomMap, type CanonPaperLike } from "../../../src/lib/research-os/ingest/canon";
import { academyNodeSlug } from "../../../src/lib/research-os/ingest/academy";
import { checkTierMonotonicity, tierViolationsToReviewItems } from "../../../src/lib/research-os/ingest/validate";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";
import { readExistingReviewList, writeReviewList } from "./lib/review-list";
import { upsertGraph } from "./lib/upsert-graph";
import { shadowRequested, shadowWrite } from "./lib/medallion-shadow";

const ROOT = resolve(__dirname, "..", "..", "..");
const OUT_DIR = join(__dirname, "out");
const BRANCH = "02-physics";
const APPLY = process.argv.includes("--apply");

function loadOverrideMap(): CanonAtomMap {
  const p = join(__dirname, "canon-atom-map.json");
  const raw = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  const map: CanonAtomMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_")) continue;
    map[key] = value as CanonAtomMap[string];
  }
  return map;
}

function toAtomIndex(): AcademyAtomRef[] {
  const files = loadAcademyCorpusFiles(ROOT);
  const out: AcademyAtomRef[] = [];
  for (const file of files) {
    for (const atom of file.atoms) {
      out.push({ branch: file.branch, sourceFile: file.sourceFile, atomId: atom.id, title: atom.title });
    }
  }
  return out;
}

function toCanonPaperLike(p: PrimaryPaper): CanonPaperLike {
  return {
    id: p.id,
    branch: p.branch,
    concept: p.concept,
    title: p.title,
    year: p.year,
    venueName: p.venueName,
    doi: p.doi,
    canonicalUrl: p.canonicalUrl,
    canonScore: p.canonScore,
  };
}

async function main() {
  const allPapers = loadPrimaryPapers();
  const papers = allPapers.filter((p) => p.branch === BRANCH).map(toCanonPaperLike);
  const authorsLabelByPaperId = new Map(allPapers.filter((p) => p.branch === BRANCH).map((p) => [p.id, authorsShort(p)]));
  const atomIndex = toAtomIndex();
  const overrideMap = loadOverrideMap();

  const result = buildCanonImport({ papers, authorsLabelByPaperId, atomIndex, overrideMap });

  const ownSlugs = new Set(result.nodes.map((n) => n.slug));
  const academySlugs = new Set(atomIndex.map((a) => academyNodeSlug(a.sourceFile, a.atomId)));
  const orphans = result.edges.filter((e) => {
    const fromOk = ownSlugs.has(e.fromSlug);
    const toOk = e.kind === "derives_from" ? academySlugs.has(e.toSlug) : ownSlugs.has(e.toSlug);
    return !fromOk || !toOk;
  });
  if (orphans.length > 0) {
    throw new Error(`canon-import: ${orphans.length} orphan edge(s) produced, e.g. ${orphans[0].fromSlug} -> ${orphans[0].toSlug}`);
  }
  const tierViolations = checkTierMonotonicity(result.nodes, result.edges);
  const reviewList = [...result.reviewList, ...tierViolationsToReviewItems(tierViolations)];

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "canon-preview.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), branch: BRANCH, stats: result.stats, nodes: result.nodes, edges: result.edges }, null, 2) +
      "\n",
  );
  writeReviewList(mergeReviewList(readExistingReviewList(), reviewList));

  console.log(
    `[canon-import] ${papers.length} canon entries (${BRANCH}), ${result.nodes.length} nodes, ${result.edges.length} edges, ` +
      `${result.reviewList.length} review items.`,
  );

  if (!APPLY) {
    console.log(`[canon-import] dry run only. Preview: scripts/research-os/ingest/out/canon-preview.json`);
  } else {
    const written = await upsertGraph(result.nodes, result.edges, { label: "canon-import", skippedEdgeHint: "target node not yet in the graph (run academy-import.ts first?)." });
    console.log(`[canon-import] wrote ${written.nodesWritten} nodes, ${written.edgesWritten} edges to graph schema.`);
  }
  if (shadowRequested()) await shadowWrite("canon-import", { nodes: result.nodes, importer: "canon-import" });
}

main().catch((err) => {
  console.error("[canon-import] FAILED:", err.message);
  process.exit(1);
});
