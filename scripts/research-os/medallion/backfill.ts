import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { decompose, FACTOR_EDGES, type DepEdge } from "../../../src/lib/research-os/primes";
import { planMedallion, type PlanNode } from "../../../src/lib/research-os/medallion/plan";
import { summarizeBackfill } from "../../../src/lib/research-os/medallion/report";
import { loadPolicy, repoIO, seedSlugs } from "./lib/repo-io";

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
  if (process.argv.includes("--apply")) {
    console.error("[medallion-backfill] this runner is a dry run; the apply step lands with rollout stage 2.");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  const nodes = await all<NodeRow>(svc, "nodes", "id, slug, title, kind, branch, provenance, visibility, superseded_by");
  const edges = await all<EdgeRow>(svc, "edges", "id, from_id, to_id, kind, confidence", (q) => q.in("kind", Object.keys(FACTOR_EDGES)));
  const imports = await all<{ id: string; node_id: string | null }>(svc, "imports", "id, node_id");
  const files = await all<{ id: string; import_id: string }>(svc, "import_files", "id, import_id");

  const { policy } = loadPolicy();
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
      `Transcript-lineage nodes ${report.transcript.nodes}, on a dependency path ${report.transcript.onDependencyPath}, deepest layer ${report.transcript.deepest}. Nothing written.`,
  );
}

main().catch((err) => {
  console.error("[medallion-backfill] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
