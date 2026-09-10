/**
 * Research OS for K-12, canon entry importer CLI (bkt-ros, ingestion
 * slice, task item 2). Reads every bucket-canon/02-physics/ dossier's
 * primary-papers.yaml record (via src/lib/canon-primary.ts's existing
 * loader, the same one /api/research already depends on) and every
 * importable Academy corpus atom (via lib/load-academy-corpus.ts, the
 * same loader academy-import.ts uses, so a `derives_from` target always
 * agrees with the node academy-import.ts writes), maps each
 * canon entry to a node plus its cites/derives_from edges
 * (src/lib/research-os/ingest/canon.ts), validates the result, and either
 * previews it (default) or upserts it into Supabase (--apply).
 *
 * Must run with the repo root as the working directory:
 * src/lib/canon-primary.ts's own loader resolves bucket-canon/ off
 * `process.cwd()`.
 *
 * Run (from the repo root):
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/canon-import.ts
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/canon-import.ts --apply
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadPrimaryPapers, authorsShort, type PrimaryPaper } from "../../../src/lib/canon-primary";
import { buildCanonImport, type AcademyAtomRef, type CanonAtomMap, type CanonPaperLike } from "../../../src/lib/research-os/ingest/canon";
import { academyNodeSlug } from "../../../src/lib/research-os/ingest/academy";
import { checkTierMonotonicity, tierViolationsToReviewItems } from "../../../src/lib/research-os/ingest/validate";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import type { IngestEdgeDraft, IngestNodeDraft, ReviewItem } from "../../../src/lib/research-os/ingest/types";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";

const ROOT = resolve(__dirname, "..", "..", "..");
const OUT_DIR = join(__dirname, "out");
const BRANCH = "02-physics"; // this importer's scope, per the ingestion task
const APPLY = process.argv.includes("--apply");

function loadOverrideMap(): CanonAtomMap {
  const p = join(__dirname, "canon-atom-map.json");
  const raw = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  const map: CanonAtomMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_")) continue; // "_comment" / "_seed_note"
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

async function applyToSupabase(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[]): Promise<{ nodesWritten: number; edgesWritten: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[canon-import] --apply requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Nothing written.");
    process.exit(1);
  }
  const svc = createClient(url, serviceKey, { db: { schema: "graph" }, auth: { persistSession: false } });

  const nodeRows = nodes.map((n) => ({
    slug: n.slug,
    title: n.title,
    kind: n.kind,
    tier: n.tier,
    branch: n.branch,
    summary: n.summary,
    labels: n.labels,
    provenance: n.provenance,
  }));
  const { data: upserted, error: nodeErr } = await svc.from("nodes").upsert(nodeRows, { onConflict: "slug" }).select("id,slug");
  if (nodeErr) throw new Error(`node upsert failed: ${nodeErr.message}`);
  const idBySlug = new Map((upserted ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]));

  // A `derives_from` edge's target is an Academy atom node this run does
  // not itself write; run academy-import.ts first (or --apply both) so
  // that lookup resolves. An edge whose target is not yet live is
  // skipped, never guessed. It is not lost: the raw match lives on the
  // canon entry node's own provenance.
  const edgeRows = edges
    .map((e) => ({
      from_id: idBySlug.get(e.fromSlug),
      to_id: idBySlug.get(e.toSlug),
      kind: e.kind,
      weight: e.weight ?? null,
      provenance: e.provenance ?? {},
    }))
    .filter((r) => r.from_id && r.to_id);
  const skipped = edges.length - edgeRows.length;
  if (skipped > 0) console.warn(`[canon-import] ${skipped} edge(s) skipped: target node not yet in the graph (run academy-import.ts first?).`);
  if (edgeRows.length > 0) {
    const { error: edgeErr } = await svc.from("edges").upsert(edgeRows, { onConflict: "from_id,to_id,kind", ignoreDuplicates: true });
    if (edgeErr) throw new Error(`edge upsert failed: ${edgeErr.message}`);
  }
  return { nodesWritten: nodeRows.length, edgesWritten: edgeRows.length };
}

async function main() {
  const allPapers = loadPrimaryPapers();
  const papers = allPapers.filter((p) => p.branch === BRANCH).map(toCanonPaperLike);
  const authorsLabelByPaperId = new Map(allPapers.filter((p) => p.branch === BRANCH).map((p) => [p.id, authorsShort(p)]));
  const atomIndex = toAtomIndex();
  const overrideMap = loadOverrideMap();

  const result = buildCanonImport({ papers, authorsLabelByPaperId, atomIndex, overrideMap });

  // Orphan check, cross-importer aware: a `cites` edge must resolve within
  // this run's own node set (canon entry -> its own bibliographic source
  // node, both produced here); a `derives_from` edge targets an Academy
  // atom academy-import.ts owns rather than this run, so it is checked
  // against the same atomIndex matchAcademyAtom already drew from: by
  // construction, buildCanonImport only ever emits a derives_from edge
  // whose target came from that index. This is a construction-invariant
  // check rather than a live-graph existence check; --apply's own edge
  // writer separately skips an edge whose target is not yet a live row
  // and warns.
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
  // The canon importer writes no `prerequisite` edges of its own (only
  // cites/derives_from), so this always reports zero for this run; run
  // regardless so the merged review list stays a true cross-importer view.
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
    return;
  }
  const written = await applyToSupabase(result.nodes, result.edges);
  console.log(`[canon-import] wrote ${written.nodesWritten} nodes, ${written.edgesWritten} edges to graph schema.`);
}

main().catch((err) => {
  console.error("[canon-import] FAILED:", err.message);
  process.exit(1);
});
