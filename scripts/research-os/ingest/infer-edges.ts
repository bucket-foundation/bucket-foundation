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
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/infer-edges.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPrimaryPapers, authorsShort, type PrimaryPaper } from "../../../src/lib/canon-primary";
import { buildAcademyImport, academyNodeSlug } from "../../../src/lib/research-os/ingest/academy";
import { buildCanonImport, type AcademyAtomRef, type CanonAtomMap, type CanonPaperLike } from "../../../src/lib/research-os/ingest/canon";
import { inferEdges, pairKey } from "../../../src/lib/research-os/ingest/infer";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import type { IngestNodeDraft, ReviewItem } from "../../../src/lib/research-os/ingest/types";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";

const ROOT = resolve(__dirname, "..", "..", "..");
const OUT_DIR = join(__dirname, "out");
const SEED_PATH = join(ROOT, "supabase", "seed", "research-os-sky-blue.json");
const CANON_BRANCH = "02-physics"; // matches canon-import.ts's own scope

interface SeedNode {
  slug: string;
  title: string;
  kind: IngestNodeDraft["kind"];
  tier: number;
  branch: string;
  summary: string | null;
}
interface SeedEdge {
  from: string;
  to: string;
  kind: string;
}
interface SeedFile {
  nodes: SeedNode[];
  edges: SeedEdge[];
}

function loadSeed(): SeedFile {
  return JSON.parse(readFileSync(SEED_PATH, "utf8")) as SeedFile;
}

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

/** The node pool this pass scans: the Academy corpus, the canon dossiers
 * (both rebuilt in memory, the same drafts academy-import.ts /
 * canon-import.ts would write), plus the hand-authored seed path. A slug
 * collision across these three sources never happens by construction
 * (`academy-`, `canon-`/`canon-source-`, and the seed's own bare slugs are
 * disjoint namespaces); this function still last-writer-wins on a
 * collision, keeping a proposal pass running past an unexpected input
 * shape instead of throwing. */
function buildNodePool(): { nodes: IngestNodeDraft[]; existingPrerequisitePairs: Set<string> } {
  const academyFiles = loadAcademyCorpusFiles(ROOT);
  const academy = buildAcademyImport(academyFiles);

  const allPapers = loadPrimaryPapers();
  const papers = allPapers.filter((p) => p.branch === CANON_BRANCH).map(toCanonPaperLike);
  const authorsLabelByPaperId = new Map(allPapers.filter((p) => p.branch === CANON_BRANCH).map((p) => [p.id, authorsShort(p)]));
  const canon = buildCanonImport({ papers, authorsLabelByPaperId, atomIndex: toAtomIndex(), overrideMap: loadOverrideMap() });

  const seed = loadSeed();
  const seedNodes: IngestNodeDraft[] = seed.nodes.map((n) => ({
    slug: n.slug,
    title: n.title,
    kind: n.kind,
    tier: n.tier,
    branch: n.branch,
    summary: n.summary,
    labels: { en: { title: n.title } },
    provenance: {},
  }));

  const byId = new Map<string, IngestNodeDraft>();
  for (const n of [...academy.nodes, ...canon.nodes, ...seedNodes]) byId.set(n.slug, n);

  const existingPrerequisitePairs = new Set<string>();
  for (const e of academy.edges) {
    if (e.kind === "prerequisite") existingPrerequisitePairs.add(pairKey(e.fromSlug, e.toSlug));
  }
  for (const e of seed.edges) {
    if (e.kind === "prerequisite") existingPrerequisitePairs.add(pairKey(e.from, e.to));
  }
  // canon.ts writes no `prerequisite` edges (only cites/derives_from), so
  // nothing to add from `canon` here.

  return { nodes: Array.from(byId.values()), existingPrerequisitePairs };
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
