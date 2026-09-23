import { graphService } from "./db";

export type ProductionKind = "production" | "extension" | "replication" | "peer_review";
export const PRODUCTION_KINDS: ProductionKind[] = ["production", "extension", "replication", "peer_review"];

export const NODE_KIND_FOR: Record<ProductionKind, string> = {
  production: "production",
  extension: "extension",
  replication: "replication",
  peer_review: "peer_review",
};

export const EDGE_KIND_FOR: Record<ProductionKind, string> = {
  production: "derives_from",
  extension: "extends",
  replication: "replicates",
  peer_review: "reviews",
};

export function productionSlug(productionId: string): string {
  return `production-${productionId.slice(0, 8)}`;
}

export function productionTitle(claim: string | null | undefined, kind: ProductionKind, relatedTitle?: string | null): string {
  const text = (claim ?? "").trim().replace(/\s+/g, " ");
  if (text) return text.length > 96 ? text.slice(0, 93).trimEnd() + "…" : text;
  const noun = kind === "peer_review" ? "Peer review" : kind === "replication" ? "Replication" : kind === "extension" ? "Extension" : "Production";
  return relatedTitle ? `${noun} of ${relatedTitle}` : noun;
}

export interface AcceptedProduction {
  id: string;
  learner_id: string;
  target_node_id: string;
  related_node_id?: string | null;
  kind?: string | null;
  claim?: string | null;
  sources?: unknown[] | null;
  node_id?: string | null;
}

export async function createNodeFromProduction(p: AcceptedProduction): Promise<string | null> {
  const svc = graphService();
  const kind = (PRODUCTION_KINDS.includes(p.kind as ProductionKind) ? p.kind : "production") as ProductionKind;
  const relatedId = (kind === "production" ? p.target_node_id : p.related_node_id ?? p.target_node_id) as string;
  const { data: related, error: relatedErr } = await svc.from("nodes").select("id,title,branch,tier").eq("id", relatedId).maybeSingle();
  if (relatedErr) throw new Error(`createNodeFromProduction: related node read failed: ${relatedErr.message}`);
  const rel = related as { id: string; title: string; branch: string; tier: number } | null;
  let nodeId = p.node_id ?? null;
  if (!nodeId) {
    const { data: node, error } = await svc
      .from("nodes")
      .upsert(
        {
          slug: productionSlug(p.id),
          title: productionTitle(p.claim, kind, rel?.title),
          kind: NODE_KIND_FOR[kind],
          tier: rel ? rel.tier + 1 : 1,
          branch: rel?.branch ?? "00-productions",
          summary: (p.claim ?? "").trim() || null,
          provenance: { type: "production", production_id: p.id, kind, learner_id: p.learner_id, sources: p.sources ?? [] },
          created_by: p.learner_id,
          owner_id: p.learner_id,
          visibility: "public",
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();
    if (error || !node) return null;
    nodeId = (node as { id: string }).id;
    await svc.from("productions").update({ node_id: nodeId }).eq("id", p.id);
  }
  if (rel && rel.id !== nodeId) {
    await svc
      .from("edges")
      .upsert(
        { from_id: nodeId, to_id: rel.id, kind: EDGE_KIND_FOR[kind], confidence: 1, confidence_source: "teacher", provenance: { type: "production", production_id: p.id } },
        { onConflict: "from_id,to_id,kind", ignoreDuplicates: true }
      );
  }
  return nodeId;
}
