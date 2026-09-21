/**
 * Research OS, the Access level, server-only DB access (ros-21). Same
 * contract as db.ts: a route verifies the caller with verifyLearner(), then
 * these wrappers read and write through the service-role client bound to
 * the private `graph` schema, applying the rules in access.ts before any
 * write. Never import from a client component.
 */
import { graphService } from "./db";
import { authorizeNodes, readVisibility, storeWithNodes } from "./read-access";
import { fetchTextFromUrl, SUMMARY_CHARS } from "./import-fetch";
import {
  canView,
  decideRequest,
  grantAllowed,
  nextVisibility,
  requestAllowed,
  type AccessRequest,
  type GrantRole,
  type NodeAccess,
  type NodeGrant,
  type RequestPurpose,
  type Viewer,
  type Visibility,
} from "./access";

type GrantRow = { id: string; node_id: string; grantee_id: string | null; grantee_group: string | null; role: GrantRole; expires_at: string | null };
type RequestRow = {
  id: string;
  node_id: string;
  requester_id: string;
  purpose: RequestPurpose;
  message: string | null;
  status: AccessRequest["status"];
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

function grantFromRow(r: GrantRow): NodeGrant {
  return { id: r.id, nodeId: r.node_id, granteeId: r.grantee_id, granteeGroup: r.grantee_group, role: r.role, expiresAt: r.expires_at };
}
function requestFromRow(r: RequestRow): AccessRequest & { createdAt: string } {
  return {
    id: r.id,
    nodeId: r.node_id,
    requesterId: r.requester_id,
    purpose: r.purpose,
    message: r.message,
    status: r.status,
    decidedBy: r.decided_by,
    decidedAt: r.decided_at,
    createdAt: r.created_at,
  };
}

/**
 * ros-31: the graph a viewer may see. Public nodes always; private and
 * shared nodes when access.ts's canView allows, with the viewer's grants
 * loaded in one query for the branch's non-public nodes. Edges touching a
 * hidden node are dropped, so routing and directions never cross into a
 * node the viewer cannot open.
 */
/**
 * The nodes and edges a viewer may see. Reads through read-access.ts, so
 * an access-store failure is an outage rather than an empty grant list:
 * this function used to read the groups and the grants directly, both of
 * which answer `[]` on error, and an outage then hid every shared node
 * behind a 404 (Bucket critic C2).
 *
 * `unavailable` is set when the store failed, with no nodes and no edges,
 * so a caller can say so rather than serve a graph with holes in it.
 */
export async function filterSubgraphForViewer<N extends { id: string; visibility?: Visibility; ownerId?: string | null }, E extends { fromId: string; toId: string }>(
  nodes: N[],
  edges: E[],
  viewerId: string | null
): Promise<{ nodes: N[]; edges: E[]; unavailable?: true }> {
  const nonPublic = nodes.filter((n) => (n.visibility ?? "public") !== "public");
  if (nonPublic.length === 0) return { nodes, edges };

  const access: NodeAccess[] = nodes.map((n) => ({
    id: n.id,
    visibility: readVisibility(n.visibility),
    ownerId: n.ownerId ?? null,
  }));
  const decision = await authorizeNodes(
    nodes.map((n) => n.id),
    { id: viewerId },
    "view",
    storeWithNodes(access),
  );
  if (!decision.ok) return { nodes: [], edges: [], unavailable: true };
  const keep = new Set(decision.allowed);
  return { nodes: nodes.filter((n) => keep.has(n.id)), edges: edges.filter((e) => keep.has(e.fromId) && keep.has(e.toId)) };
}

export async function loadNodeAccess(nodeId: string): Promise<NodeAccess | null> {
  const { data, error } = await graphService().from("nodes").select("id,visibility,owner_id").eq("id", nodeId).maybeSingle();
  if (error || !data) return null;
  return { id: data.id as string, visibility: (data.visibility as Visibility) ?? "public", ownerId: (data.owner_id as string | null) ?? null };
}

export async function loadGrants(nodeId: string): Promise<NodeGrant[]> {
  const { data, error } = await graphService().from("node_grants").select("id,node_id,grantee_id,grantee_group,role,expires_at").eq("node_id", nodeId);
  if (error || !data) return [];
  return (data as GrantRow[]).map(grantFromRow);
}

/** The class groups a learner belongs to, as 'class:<id>' strings, for group grants. */
export async function loadViewerGroups(learnerId: string): Promise<string[]> {
  const { data, error } = await graphService().from("class_members").select("class_id").eq("learner_id", learnerId);
  if (error || !data) return [];
  return (data as { class_id: string }[]).map((r) => `class:${r.class_id}`);
}

export async function loadRequestsForNode(nodeId: string): Promise<(AccessRequest & { createdAt: string })[]> {
  const { data, error } = await graphService()
    .from("access_requests")
    .select("id,node_id,requester_id,purpose,message,status,decided_by,decided_at,created_at")
    .eq("node_id", nodeId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as RequestRow[]).map(requestFromRow);
}

export async function loadRequestsByRequester(requesterId: string): Promise<(AccessRequest & { createdAt: string })[]> {
  const { data, error } = await graphService()
    .from("access_requests")
    .select("id,node_id,requester_id,purpose,message,status,decided_by,decided_at,created_at")
    .eq("requester_id", requesterId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as RequestRow[]).map(requestFromRow);
}

export async function loadOwnedNodes(ownerId: string): Promise<{ id: string; slug: string; title: string; visibility: Visibility }[]> {
  const { data, error } = await graphService().from("nodes").select("id,slug,title,visibility").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as { id: string; slug: string; title: string; visibility: Visibility }[];
}

export type AccessResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function setVisibility(node: NodeAccess, actor: Viewer, requested: Visibility): Promise<AccessResult<Visibility>> {
  const next = nextVisibility(node, actor, requested);
  if (!next) return { ok: false, error: "not_owner" };
  const { error } = await graphService().from("nodes").update({ visibility: next }).eq("id", node.id);
  if (error) return { ok: false, error: "write_failed" };
  return { ok: true, value: next };
}

export async function grantAccess(
  node: NodeAccess,
  actor: Viewer,
  grantee: { id?: string; group?: string },
  role: GrantRole,
  expiresAt?: string | null
): Promise<AccessResult<NodeGrant>> {
  if (!grantAllowed(node, actor, role)) return { ok: false, error: "grant_refused" };
  if (Boolean(grantee.id) === Boolean(grantee.group)) return { ok: false, error: "grantee_required" };
  const row = { node_id: node.id, grantee_id: grantee.id ?? null, grantee_group: grantee.group ?? null, role, granted_by: actor.id, expires_at: expiresAt ?? null };
  const { data, error } = await graphService()
    .from("node_grants")
    .upsert(row, { onConflict: grantee.id ? "node_id,grantee_id,role" : "node_id,grantee_group,role" })
    .select("id,node_id,grantee_id,grantee_group,role,expires_at")
    .single();
  if (error || !data) return { ok: false, error: "write_failed" };
  return { ok: true, value: grantFromRow(data as GrantRow) };
}

export async function revokeGrant(node: NodeAccess, actor: Viewer, grantId: string): Promise<AccessResult<null>> {
  if (node.ownerId !== actor.id) return { ok: false, error: "not_owner" };
  const { error } = await graphService().from("node_grants").delete().eq("id", grantId).eq("node_id", node.id);
  if (error) return { ok: false, error: "write_failed" };
  return { ok: true, value: null };
}

export async function createRequest(
  node: NodeAccess,
  requester: Viewer,
  purpose: RequestPurpose,
  message: string | null,
  grants: NodeGrant[]
): Promise<AccessResult<AccessRequest & { createdAt: string }>> {
  if (!requestAllowed(node, requester, purpose, grants)) return { ok: false, error: "request_refused" };
  const { data, error } = await graphService()
    .from("access_requests")
    .insert({ node_id: node.id, requester_id: requester.id, purpose, message })
    .select("id,node_id,requester_id,purpose,message,status,decided_by,decided_at,created_at")
    .single();
  if (error || !data) return { ok: false, error: error?.code === "23505" ? "already_pending" : "write_failed" };
  return { ok: true, value: requestFromRow(data as RequestRow) };
}

export async function decideAccessRequest(
  node: NodeAccess,
  actor: Viewer,
  requestId: string,
  decision: "granted" | "denied"
): Promise<AccessResult<{ request: AccessRequest; grant: NodeGrant | null }>> {
  const svc = graphService();
  const { data: row, error: readErr } = await svc
    .from("access_requests")
    .select("id,node_id,requester_id,purpose,message,status,decided_by,decided_at,created_at")
    .eq("id", requestId)
    .eq("node_id", node.id)
    .maybeSingle();
  if (readErr || !row) return { ok: false, error: "not_found" };
  const decided = decideRequest(node, requestFromRow(row as RequestRow), actor, decision);
  if (!decided) return { ok: false, error: "decide_refused" };
  const { error: updErr } = await svc
    .from("access_requests")
    .update({ status: decided.request.status, decided_by: decided.request.decidedBy, decided_at: decided.request.decidedAt })
    .eq("id", requestId);
  if (updErr) return { ok: false, error: "write_failed" };
  if (decided.grant) {
    const g = decided.grant;
    const { error: grantErr } = await svc
      .from("node_grants")
      .upsert({ node_id: g.nodeId, grantee_id: g.granteeId, role: g.role, granted_by: actor.id }, { onConflict: "node_id,grantee_id,role" });
    if (grantErr) return { ok: false, error: "grant_write_failed" };
  }
  return { ok: true, value: decided };
}

export async function createImport(
  ownerId: string,
  input: { kind: "dataset" | "paper" | "notes" | "corpus"; title: string; source?: Record<string, unknown> }
): Promise<AccessResult<{ importId: string; nodeId: string; fetched: boolean }>> {
  const svc = graphService();
  const slug = `import-${ownerId.slice(0, 8)}-${Date.now().toString(36)}`;
  // A source with a public URL is fetched so the node carries its text
  // (import-fetch.ts); the import stays a title and a link when it fails.
  const url = typeof input.source?.url === "string" ? input.source.url : null;
  const fetched = url ? await fetchTextFromUrl(url) : null;
  const { data: node, error: nodeErr } = await svc
    .from("nodes")
    .insert({
      slug,
      title: input.title,
      kind: input.kind === "paper" ? "primary_source" : "artifact",
      tier: 0,
      branch: "00-imports",
      summary: fetched ? fetched.text.slice(0, SUMMARY_CHARS) : null,
      worked_example: fetched ? { text: fetched.text, source: url } : null,
      provenance: { type: "import", kind: input.kind, ...(input.source ?? {}), ...(fetched ? { fetched_title: fetched.title, fetched_bytes: fetched.bytes, fetched_at: new Date().toISOString() } : {}) },
      created_by: ownerId,
      owner_id: ownerId,
      visibility: "private",
    })
    .select("id")
    .single();
  if (nodeErr || !node) return { ok: false, error: "node_write_failed" };
  const { data: imp, error: impErr } = await svc
    .from("imports")
    .insert({ owner_id: ownerId, kind: input.kind, title: input.title, source: input.source ?? {}, node_id: node.id })
    .select("id")
    .single();
  if (impErr || !imp) return { ok: false, error: "import_write_failed" };
  return { ok: true, value: { importId: imp.id as string, nodeId: node.id as string, fetched: Boolean(fetched) } };
}
