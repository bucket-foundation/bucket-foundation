import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../paging";
import type { Decomposition } from "../primes";
import { lineageSummary, type LineageSummary } from "./report";

type Query = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

function readAll<T>(svc: SupabaseClient, table: string, columns: string, orders: string[], filter?: (q: Query) => Query): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = orders
      .slice(1)
      .reduce((acc, o) => acc.order(o, { ascending: true }) as unknown as Query, svc.from(table).select(columns).order(orders[0], { ascending: true }) as unknown as Query)
      .range(page.from, page.to) as unknown as Query;
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  }).catch((err: unknown) => {
    throw new Error(`${table}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

export async function readLineageSummary(svc: SupabaseClient, decomposition: Map<string, Decomposition>): Promise<LineageSummary> {
  const [nodes, lineage, silver, paths, pending, queue] = await Promise.all([
    readAll<{ id: string; slug: string | null; created_at: string; provenance_type: string | null }>(svc, "nodes", "id, slug, created_at, provenance_type:provenance->>type", ["id"], (q) =>
      q.eq("visibility", "public").is("superseded_by", null),
    ),
    readAll<{ node_id: string | null; silver_item_id: string; promoted_by: string; promoted_at: string }>(svc, "gold_lineage", "id, node_id, silver_item_id, promoted_by, promoted_at", ["id"]),
    readAll<{ id: string; source_id: string }>(svc, "silver_items", "id, source_id", ["id"]),
    readAll<{ source_id: string; repo_path: string }>(svc, "bronze_file_paths", "source_id, source_revision, repo_path", ["source_id", "source_revision", "repo_path"]),
    readAll<{ action: string }>(svc, "edge_proposals", "id, action", ["id"], (q) => q.eq("status", "pending").eq("confidence_source", "medallion_lexical")),
    readAll<{ node_id: string }>(svc, "medallion_withdrawn_nodes", "node_id", ["node_id"], (q) => q.is("reviewed_at", null)),
  ]);
  const pathsBySource = new Map<string, string[]>();
  for (const p of paths) pathsBySource.set(p.source_id, [...(pathsBySource.get(p.source_id) ?? []), p.repo_path]);
  return lineageSummary({
    nodes: nodes.map((n) => ({ id: n.id, slug: n.slug, createdAt: n.created_at, provenanceType: n.provenance_type })),
    lineage,
    silverSource: new Map(silver.map((s) => [s.id, s.source_id])),
    pathsBySource,
    decomposition,
    pending,
    withdrawnQueue: queue.length,
  });
}
