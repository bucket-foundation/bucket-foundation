import type { SupabaseClient } from "@supabase/supabase-js";

export type LineageTarget = { nodeId: string } | { edge: { fromId: string; toId: string; kind: string } };

export async function recordReviewerLineage(svc: SupabaseClient, target: LineageTarget, silverItemId: string, reviewerId: string): Promise<string | null> {
  let row: Record<string, unknown>;
  if ("nodeId" in target) {
    row = { node_id: target.nodeId };
  } else {
    const { data, error } = await svc
      .from("edges")
      .select("id")
      .eq("from_id", target.edge.fromId)
      .eq("to_id", target.edge.toId)
      .eq("kind", target.edge.kind)
      .maybeSingle();
    if (error) return error.message;
    if (!data) return "edge_not_found";
    row = { edge_id: (data as { id: string }).id };
  }
  const { error } = await svc.from("gold_lineage").insert([{ ...row, silver_item_id: silverItemId, promoted_by: "reviewer", reviewer_id: reviewerId }]);
  if (error && error.code !== "23505") return error.message;
  return null;
}
