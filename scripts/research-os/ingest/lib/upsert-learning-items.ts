import { createClient } from "@supabase/supabase-js";
import type { LearningItemDraft } from "../../../../src/lib/research-os/ingest/academy-items";

export const NODES_PER_CALL = 50;

export async function upsertLearningItems(
  itemsBySlug: Map<string, LearningItemDraft[]>,
  idBySlug: Map<string, string>,
  label: string,
): Promise<{ nodes: number; written: number; deleted: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error(`[${label}] --apply requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY`);
  const slugs = Array.from(itemsBySlug.keys()).sort();
  const missing = slugs.filter((s) => !idBySlug.has(s));
  if (missing.length > 0) throw new Error(`[${label}] ${missing.length} node(s) missing for learning items, e.g. ${missing[0]}`);
  const svc = createClient(url, serviceKey, { db: { schema: "graph" }, auth: { persistSession: false } });
  let written = 0;
  let deleted = 0;
  for (let i = 0; i < slugs.length; i += NODES_PER_CALL) {
    const batch = slugs.slice(i, i + NODES_PER_CALL).map((slug) => ({
      node_id: idBySlug.get(slug),
      items: (itemsBySlug.get(slug) ?? []).map((it) => ({ kind: it.kind, ordinal: it.ordinal, body: it.body, content_hash: it.contentHash, provenance: it.provenance })),
    }));
    const { data, error } = await svc.rpc("replace_learning_items_many", { p_nodes: batch });
    if (error) throw new Error(`[${label}] replace_learning_items_many failed at ${slugs[i]}: ${error.message}`);
    const r = (data && typeof data === "object" ? data : {}) as { written?: number; deleted?: number };
    written += r.written ?? 0;
    deleted += r.deleted ?? 0;
  }
  return { nodes: slugs.length, written, deleted };
}
