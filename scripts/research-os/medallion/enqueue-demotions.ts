import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { demotionRows, type DemotionEdge } from "../../../src/lib/research-os/medallion/demotions";

const APPLY = process.argv.includes("--apply");

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

  const tags = await all<{ id: string; slug: string; branch: string }>(svc, "nodes", "id,slug,branch", (q) => q.eq("provenance->>type", "canon_concept"));
  const byId = new Map(tags.map((t) => [t.id, t]));
  const edges = (await all<{ id: string; from_id: string; to_id: string; confidence: number; provenance: Record<string, unknown> }>(svc, "edges", "id,from_id,to_id,confidence,provenance", (q) =>
    q.eq("kind", "derives_from").eq("provenance->>rule", "concept_lexical"),
  )).filter((e) => byId.has(e.from_id));
  const atomIds = Array.from(new Set(edges.map((e) => e.to_id)));
  const atoms = new Map<string, string>();
  for (let i = 0; i < atomIds.length; i += 100) {
    const { data, error } = await svc.from("nodes").select("id,slug").in("id", atomIds.slice(i, i + 100));
    if (error) throw new Error(`atom lookup failed: ${error.message}`);
    ((data as { id: string; slug: string }[]) || []).forEach((r) => atoms.set(r.id, r.slug));
  }
  const lineage = new Map<string, string>();
  const tagIds = Array.from(new Set(edges.map((e) => e.from_id)));
  for (let i = 0; i < tagIds.length; i += 100) {
    const { data, error } = await svc.from("gold_lineage").select("node_id,silver_item_id,promoted_by").in("node_id", tagIds.slice(i, i + 100));
    if (error) throw new Error(`lineage lookup failed: ${error.message}`);
    ((data as { node_id: string; silver_item_id: string }[]) || []).forEach((r) => lineage.set(r.node_id, r.silver_item_id));
  }
  const demotions: DemotionEdge[] = edges.flatMap((e) => {
    const tag = byId.get(e.from_id);
    const atom = atoms.get(e.to_id);
    return tag && atom ? [{ tagSlug: tag.slug, tagBranch: tag.branch, atomSlug: atom, confidence: e.confidence, provenance: e.provenance, silverItemId: lineage.get(e.from_id) ?? null }] : [];
  });
  const rows = demotionRows(demotions);
  const tagCount = new Set(rows.map((r) => r.to_slug)).size;
  console.log(`[enqueue-demotions] ${rows.length} concept_lexical derives_from edges on ${tagCount} canon concept tags, ${rows.filter((r) => r.silver_item_id).length} with a silver item.`);
  if (!APPLY) {
    console.log("[enqueue-demotions] dry run, nothing written.");
    return;
  }
  const { data, error } = await svc.from("edge_proposals").upsert(rows, { onConflict: "from_slug,to_slug", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(`demotion write failed: ${error.message}`);
  console.log(`[enqueue-demotions] queued ${((data as unknown[]) || []).length} new demotions; the rest were queued before.`);
}

main().catch((err) => {
  console.error("[enqueue-demotions] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
