import { graphService, loadSubgraph } from "../db";
import { filterSubgraphForViewer } from "../access-db";
import { authorizeNode } from "../read-access";
import type { CtxItem, ModuleContext } from "./generate";

export type ContextRead = { ok: true; ctx: ModuleContext } | { ok: false; reason: "not_found" | "unavailable" };

export async function loadModuleContext(slug: string, viewerId: string): Promise<ContextRead> {
  const svc = graphService();
  const { data: row, error } = await svc.from("nodes").select("id,branch").eq("slug", slug).maybeSingle();
  if (error) return { ok: false, reason: "unavailable" };
  if (!row) return { ok: false, reason: "not_found" };
  const { id, branch } = row as { id: string; branch: string };
  const access = await authorizeNode(id, { id: viewerId }, "view");
  if (!access.ok) return { ok: false, reason: access.reason === "unavailable" ? "unavailable" : "not_found" };

  const [graph, items] = await Promise.all([
    loadSubgraph(branch),
    svc.from("learning_items").select("id,kind,ordinal,body").eq("node_id", id).order("kind").order("ordinal").limit(500),
  ]);
  if (items.error) return { ok: false, reason: "unavailable" };
  const filtered = await filterSubgraphForViewer(graph.nodes, graph.edges, viewerId);
  if (!filtered.ok) return { ok: false, reason: "unavailable" };
  const lite = filtered.nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, summary: n.summary, tier: n.tier, origin: typeof n.provenance?.type === "string" ? n.provenance.type : null, workedExample: n.workedExample }));
  const node = lite.find((n) => n.id === id);
  if (!node) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    ctx: {
      node,
      items: (items.data ?? []) as CtxItem[],
      nodes: lite,
      prerequisites: filtered.edges.filter((e) => e.kind === "prerequisite").map((e) => ({ id: e.id, fromId: e.fromId, toId: e.toId })),
    },
  };
}
