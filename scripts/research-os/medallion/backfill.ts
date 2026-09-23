import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { decompose, FACTOR_EDGES, type DepEdge } from "../../../src/lib/research-os/primes";
import { planMedallion, type PlanNode } from "../../../src/lib/research-os/medallion/plan";
import { summarizeBackfill } from "../../../src/lib/research-os/medallion/report";
import { admissionRow, runRevision } from "../../../src/lib/research-os/medallion/bronze";
import { SILVER_CONFLICT, silverKey } from "../../../src/lib/research-os/medallion/plan";
import { insertNodeLineage, silverIds } from "../ingest/lib/medallion-shadow";
import { loadPolicy, repoIO, seedSlugs } from "./lib/repo-io";

const APPLY = process.argv.includes("--apply");

type NodeRow = { id: string; slug: string; title: string; kind: string; branch: string; provenance: Record<string, unknown>; visibility: string; superseded_by: string | null };
type EdgeRow = { from_id: string; to_id: string; kind: string; confidence: number | null };

function all<T>(svc: SupabaseClient, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = svc.from(table).select(columns).order("id").range(page.from, page.to);
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  const nodes = await all<NodeRow>(svc, "nodes", "id, slug, title, kind, branch, provenance, visibility, superseded_by");
  const edges = await all<EdgeRow>(svc, "edges", "id, from_id, to_id, kind, confidence", (q) => q.in("kind", Object.keys(FACTOR_EDGES)));
  const imports = await all<{ id: string; node_id: string | null }>(svc, "imports", "id, node_id");
  const files = await all<{ id: string; import_id: string }>(svc, "import_files", "id, import_id");

  const { policy, sha256 } = loadPolicy();
  const plan = planMedallion({
    nodes: nodes.map((n): PlanNode => ({ slug: n.slug, title: n.title, kind: n.kind, branch: n.branch, provenance: n.provenance ?? {} })),
    io: repoIO,
    policy,
    seedSlugs: seedSlugs(policy),
    parser: "legacy",
    parserRevision: "legacy/1",
  });

  const live = nodes.filter((n) => n.visibility === "public" && !n.superseded_by);
  const liveIds = new Set(live.map((n) => n.id));
  const dep: DepEdge[] = edges
    .filter((e) => liveIds.has(e.from_id) && liveIds.has(e.to_id))
    .map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const dec = decompose(
    live.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: n.branch })),
    dep,
  );

  const withFiles = new Set(files.map((f) => f.import_id));
  const uploadNodesWithFile = new Set(imports.filter((i) => i.node_id && withFiles.has(i.id)).map((i) => i.node_id as string));

  const report = summarizeBackfill({
    nodes: nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, provenanceType: typeof n.provenance?.type === "string" ? (n.provenance.type as string) : null })),
    plan,
    decomposition: dec,
    uploadNodesWithFile,
  });
  console.log(JSON.stringify(report, null, 2));
  console.log(
    `[medallion-backfill] dry run: ${report.nodes} gold nodes, lineage known ${report.lineage.known} ` +
      `(${report.lineage.file} file, ${report.lineage.directory} directory, ${report.lineage.upload} upload), unknown ${report.lineage.unknown}. ` +
      `${report.bronze.sources} bronze sources (${report.bronze.textWithheld} with text withheld), ${report.silver.items} silver items. ` +
      `Transcript-lineage nodes ${report.transcript.nodes}, on a dependency path ${report.transcript.onDependencyPath}, deepest layer ${report.transcript.deepest}.` +
      (APPLY ? "" : " Dry run, nothing written."),
  );
  if (!APPLY) return;

  const { data: admitted, error: admitErr } = await svc.rpc("admit_bronze_sources", {
    p_run_revision: runRevision(plan.bronze),
    p_policy_sha256: sha256,
    p_policy_status: policy.status,
    p_rows: plan.bronze.map(admissionRow),
  });
  if (admitErr) throw new Error(`bronze admission failed: ${admitErr.message}`);
  const refused = new Set(((admitted as { refused?: { source_id: string }[] })?.refused ?? []).map((r) => r.source_id));
  const silverRows = plan.silver.filter((s) => !refused.has(s.source_id));
  for (let i = 0; i < silverRows.length; i += 500) {
    const { error } = await svc.from("silver_items").upsert(silverRows.slice(i, i + 500), { onConflict: SILVER_CONFLICT, ignoreDuplicates: true });
    if (error) throw new Error(`silver write failed: ${error.message}`);
  }
  const ids = await silverIds(svc, silverRows);
  const pairs = nodes.flatMap((n) => {
    const s = plan.silverBySlug.get(n.slug);
    const silverId = s && !refused.has(s.source_id) ? ids.get(silverKey(s)) : undefined;
    return silverId ? [{ nodeId: n.id, silverId }] : [];
  });
  const written = await insertNodeLineage(svc, pairs, { promoted_by: "backfill" });
  console.log(`[medallion-backfill] applied: ${plan.bronze.length - refused.size} bronze, ${silverRows.length} silver, ${written} new lineage rows of ${pairs.length} mapped nodes, ${refused.size} bronze refused.`);
}

main().catch((err) => {
  console.error("[medallion-backfill] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
