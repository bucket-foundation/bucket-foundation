import { createClient } from "@supabase/supabase-js";
import type { IngestEdgeDraft, IngestNodeDraft } from "../../../../src/lib/research-os/ingest/types";

export async function applyDrafts(label: string, nodes: IngestNodeDraft[], edges: IngestEdgeDraft[], flags: { slug: string; frontierFlag: string }[] = []): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(`[${label}] --apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`);
    process.exit(1);
  }
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } });
  const idBySlug = new Map<string, string>();
  for (let i = 0; i < nodes.length; i += 200) {
    const rows = nodes.slice(i, i + 200).map((n) => ({ slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary, labels: n.labels, provenance: n.provenance }));
    const { data, error } = await svc.from("nodes").upsert(rows, { onConflict: "slug" }).select("id,slug");
    if (error) throw new Error(`node upsert failed: ${error.message}`);
    (data as { id: string; slug: string }[]).forEach((r) => idBySlug.set(r.slug, r.id));
  }
  const missing = Array.from(new Set(edges.flatMap((e) => [e.fromSlug, e.toSlug]).filter((s) => !idBySlug.has(s))));
  for (let i = 0; i < missing.length; i += 60) {
    const { data, error } = await svc.from("nodes").select("id,slug").in("slug", missing.slice(i, i + 60));
    if (error) throw new Error(`slug resolution failed: ${error.message}`);
    ((data as { id: string; slug: string }[]) || []).forEach((r) => idBySlug.set(r.slug, r.id));
  }
  const rows = edges
    .map((e) => ({ from_id: idBySlug.get(e.fromSlug), to_id: idBySlug.get(e.toSlug), kind: e.kind, weight: e.weight ?? null, provenance: e.provenance ?? {}, confidence: e.confidence ?? null, confidence_source: e.confidenceSource ?? null }))
    .filter((r) => r.from_id && r.to_id && r.from_id !== r.to_id);
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await svc.from("edges").upsert(rows.slice(i, i + 500), { onConflict: "from_id,to_id,kind", ignoreDuplicates: true });
    if (error) throw new Error(`edge upsert failed: ${error.message}`);
  }
  for (const f of flags) {
    const id = idBySlug.get(f.slug);
    if (id) await svc.from("nodes").update({ frontier_flag: f.frontierFlag }).eq("id", id);
  }
  console.log(`[${label}] wrote ${nodes.length} nodes, ${rows.length} edges (${edges.length - rows.length} skipped), ${flags.length} flags.`);
}
