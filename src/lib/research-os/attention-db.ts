import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { EMBED_MODEL, embedText, publicFactorIds, type EdgeRow, type NodeVectors, type PrivateLookup } from "./attention";
import type { Snapshot } from "./makeup";
import { inChunks, pagedRead } from "./paging";
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

export function embeddingTextHash(text: string): string {
  return createHash("sha256").update(`${EMBED_MODEL}\n${text}`).digest("hex").slice(0, 32);
}

export type StoredVector = { node_id: string; text_hash: string; vector: number[] };

export function freshVectors(rows: StoredVector[], snap: Snapshot): { vectors: NodeVectors; stale: number } {
  const vectors: NodeVectors = new Map();
  let stale = 0;
  for (const r of rows) {
    const n = snap.byId.get(r.node_id);
    if (!n) continue;
    if (r.text_hash !== embeddingTextHash(embedText(n.title, snap.summaries.get(n.id)))) {
      stale++;
      continue;
    }
    vectors.set(r.node_id, r.vector);
  }
  return { vectors, stale };
}

type VectorReader = (ids: string[]) => Promise<StoredVector[]>;

export function vectorLoader(read: VectorReader, ttlMs = 600_000, now: () => number = Date.now) {
  const cache = new Map<string, { at: number; row: StoredVector | null }>();
  return async (snap: Snapshot): Promise<{ vectors: NodeVectors; stale: number }> => {
    const t = now();
    const ids = Array.from(snap.byId.keys()).sort();
    const missing = ids.filter((id) => {
      const hit = cache.get(id);
      return !hit || t - hit.at >= ttlMs;
    });
    if (missing.length) {
      const got = new Map((await read(missing)).map((r) => [r.node_id, r]));
      for (const id of missing) cache.set(id, { at: t, row: got.get(id) ?? null });
    }
    const rows: StoredVector[] = [];
    for (const id of ids) {
      const row = cache.get(id)?.row;
      if (row) rows.push(row);
    }
    return freshVectors(rows, snap);
  };
}

export function readVectorsFor(svc: SupabaseClient): VectorReader {
  return (ids) =>
    inChunks<StoredVector>(ids, (chunk, page) =>
      svc
        .from("node_embeddings")
        .select("node_id,text_hash,vector")
        .eq("model", EMBED_MODEL)
        .in("node_id", chunk)
        .order("node_id", { ascending: true })
        .range(page.from, page.to) as unknown as Promise<{ data: StoredVector[] | null; error: { message: string } | null }>,
    );
}

let sharedLoader: { svc: SupabaseClient; load: ReturnType<typeof vectorLoader> } | null = null;

export async function loadNodeVectors(svc: SupabaseClient, snap: Snapshot, ttlMs = 600_000): Promise<{ vectors: NodeVectors; stale: number }> {
  if (!sharedLoader || sharedLoader.svc !== svc) sharedLoader = { svc, load: vectorLoader(readVectorsFor(svc), ttlMs) };
  return sharedLoader.load(snap);
}
