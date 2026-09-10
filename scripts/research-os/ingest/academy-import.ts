/**
 * Research OS for K-12, Academy corpus importer CLI (bkt-ros, ingestion
 * slice, task item 1). Reads every importable learning/app/corpus/*.json
 * file, maps each atom to a graph.nodes draft and each `requires` edge to
 * a `prerequisite` graph.edges draft (src/lib/research-os/ingest/
 * academy.ts), validates the result (no orphan edges, tier monotonicity),
 * and either previews it (default) or upserts it into Supabase (--apply).
 *
 * Dry run (default): validates, writes a JSON preview to
 * scripts/research-os/ingest/out/academy-preview.json, merges any review
 * items into scripts/research-os/ingest/out/review-list.json, prints a
 * one-line summary. No network.
 *
 * Apply: also upserts nodes (onConflict: "slug", matching this importer's
 * own idempotency key) and edges (onConflict: "from_id,to_id,kind",
 * ignoreDuplicates) through the graph-schema service-role client, the same
 * construction scripts/seed-research-os.mjs uses.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/academy-import.ts
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/academy-import.ts --apply
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildAcademyImport } from "../../../src/lib/research-os/ingest/academy";
import { checkOrphanEdges, checkTierMonotonicity, tierViolationsToReviewItems } from "../../../src/lib/research-os/ingest/validate";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import type { IngestEdgeDraft, IngestNodeDraft, ReviewItem } from "../../../src/lib/research-os/ingest/types";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";

const ROOT = resolve(__dirname, "..", "..", "..");
const OUT_DIR = join(__dirname, "out");
const APPLY = process.argv.includes("--apply");

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
    console.error("[academy-import] --apply requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Nothing written.");
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

  const edgeRows = edges
    .map((e) => ({
      from_id: idBySlug.get(e.fromSlug),
      to_id: idBySlug.get(e.toSlug),
      kind: e.kind,
      weight: e.weight ?? null,
      provenance: e.provenance ?? {},
      confidence: e.confidence ?? null,
      confidence_source: e.confidenceSource ?? null,
    }))
    .filter((r) => r.from_id && r.to_id);
  if (edgeRows.length > 0) {
    const { error: edgeErr } = await svc.from("edges").upsert(edgeRows, { onConflict: "from_id,to_id,kind", ignoreDuplicates: true });
    if (edgeErr) throw new Error(`edge upsert failed: ${edgeErr.message}`);
  }
  return { nodesWritten: nodeRows.length, edgesWritten: edgeRows.length };
}

async function main() {
  const files = loadAcademyCorpusFiles(ROOT);
  const result = buildAcademyImport(files);

  const orphans = checkOrphanEdges(result.nodes, result.edges);
  if (orphans.length > 0) {
    // A structural bug in the importer itself: a data-quality issue stays
    // on the review list for a human, but every edge this importer emits
    // must resolve within its own node set.
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
    return;
  }
  const written = await applyToSupabase(result.nodes, result.edges);
  console.log(`[academy-import] wrote ${written.nodesWritten} nodes, ${written.edgesWritten} edges to graph schema.`);
}

main().catch((err) => {
  console.error("[academy-import] FAILED:", err.message);
  process.exit(1);
});
