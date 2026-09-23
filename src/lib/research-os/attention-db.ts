import type { SupabaseClient } from "@supabase/supabase-js";
import { EMBED_MODEL, publicFactorIds, type EdgeRow, type NodeVectors, type PrivateLookup } from "./attention";
import type { Snapshot } from "./makeup";
import { pagedRead } from "./paging";
import { FACTOR_EDGES } from "./primes";
import { authorizeNode } from "./read-access";

export async function privateQueryFactors(svc: SupabaseClient, slugs: string[], snap: Snapshot, learnerId: string | null): Promise<PrivateLookup> {
  const out: PrivateLookup = { factors: [], denied: 0, missing: 0 };
  if (!learnerId) return { ...out, denied: slugs.length };
  const { data, error } = await svc.from("nodes").select("id,slug").in("slug", slugs);
  if (error) throw new Error(error.message);
  const idOf = new Map(((data as { id: string; slug: string }[]) || []).map((r) => [r.slug, r.id]));
  for (const slug of slugs) {
    const id = idOf.get(slug);
    if (!id) {
      out.missing++;
      continue;
    }
    const readable = await authorizeNode(id, { id: learnerId }, "view");
    if (!readable.ok) {
      if (readable.reason === "unavailable") throw new Error(readable.detail ?? "access unavailable");
      if (readable.reason === "not_found") out.missing++;
      else out.denied++;
      continue;
    }
    const edges = await pagedRead<EdgeRow>((page) =>
      svc
        .from("edges")
        .select("from_id,to_id,kind")
        .in("kind", Object.keys(FACTOR_EDGES))
        .or(`from_id.eq.${id},to_id.eq.${id}`)
        .order("id", { ascending: true })
        .range(page.from, page.to) as unknown as Promise<{ data: EdgeRow[] | null; error: { message: string } | null }>,
    );
    out.factors.push(publicFactorIds(id, edges, snap));
  }
  return out;
}

let cachedVectors: { at: number; vectors: NodeVectors } | null = null;

export async function loadNodeVectors(svc: SupabaseClient, ttlMs = 600_000): Promise<NodeVectors> {
  if (cachedVectors && Date.now() - cachedVectors.at < ttlMs) return cachedVectors.vectors;
  const rows = await pagedRead<{ node_id: string; vector: number[] }>((page) =>
    svc
      .from("node_embeddings")
      .select("node_id,vector")
      .eq("model", EMBED_MODEL)
      .order("node_id", { ascending: true })
      .range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; vector: number[] }[] | null; error: { message: string } | null }>,
  );
  const vectors: NodeVectors = new Map(rows.map((r) => [r.node_id, r.vector]));
  cachedVectors = { at: Date.now(), vectors };
  return vectors;
}
