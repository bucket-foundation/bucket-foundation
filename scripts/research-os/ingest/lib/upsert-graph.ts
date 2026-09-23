import { createClient } from "@supabase/supabase-js";
import type { IngestEdgeDraft, IngestNodeDraft } from "../../../../src/lib/research-os/ingest/types";

export interface UpsertGraphOptions {
  label: string;
  skippedEdgeHint?: string;
}

export async function upsertGraph(
  nodes: IngestNodeDraft[],
  edges: IngestEdgeDraft[],
  { label, skippedEdgeHint }: UpsertGraphOptions,
): Promise<{ nodesWritten: number; edgesWritten: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(`[${label}] --apply requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Nothing written.`);
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
  const skipped = edges.length - edgeRows.length;
  if (skippedEdgeHint && skipped > 0) console.warn(`[${label}] ${skipped} edge(s) skipped: ${skippedEdgeHint}`);
  if (edgeRows.length > 0) {
    const { error: edgeErr } = await svc.from("edges").upsert(edgeRows, { onConflict: "from_id,to_id,kind", ignoreDuplicates: true });
    if (edgeErr) throw new Error(`edge upsert failed: ${edgeErr.message}`);
  }
  const { data: raised, error: tierErr } = await svc.rpc("enforce_prerequisite_tiers");
  if (tierErr) throw new Error(`enforce_prerequisite_tiers failed: ${tierErr.message}`);
  if (typeof raised === "number" && raised > 0) console.log(`raised ${raised} grade tiers to keep learning order monotone`);
  return { nodesWritten: nodeRows.length, edgesWritten: edgeRows.length };
}
