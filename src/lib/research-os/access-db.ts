import { graphService, inChunks, pagedRead } from "./db";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authorizeNodes,
  dbAccessStore,
  GRANT_COLUMNS,
  grantFromRow,
  readGrants,
  readVisibility,
  storeWithNodes,
  type AccessStore,
  type GrantRow,
  type StoreResult,
} from "./read-access";
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

export type SubgraphForViewer<N, E> = { ok: true; nodes: N[]; edges: E[] } | { ok: false; reason: "unavailable" };

export async function filterSubgraphForViewer<N extends { id: string; visibility?: Visibility; ownerId?: string | null }, E extends { fromId: string; toId: string }>(
  nodes: N[],
  edges: E[],
  viewerId: string | null,
  store: AccessStore = dbAccessStore,
): Promise<SubgraphForViewer<N, E>> {
  const nonPublic = nodes.filter((n) => readVisibility(n.visibility) !== "public");
  if (nonPublic.length === 0) return { ok: true, nodes, edges };

  const access: NodeAccess[] = nodes.map((n) => ({
    id: n.id,
    visibility: readVisibility(n.visibility),
    ownerId: n.ownerId ?? null,
  }));
  const decision = await authorizeNodes(
    nodes.map((n) => n.id),
    { id: viewerId },
    "view",
    storeWithNodes(access, store),
  );
  if (!decision.ok) return { ok: false, reason: "unavailable" };
  const keep = new Set(decision.allowed);
  return { ok: true, nodes: nodes.filter((n) => keep.has(n.id)), edges: edges.filter((e) => keep.has(e.fromId) && keep.has(e.toId)) };
}

export type AccessRead<T> = { ok: true; value: T } | { ok: false; reason: "unavailable" };

export async function loadNodeAccess(nodeId: string): Promise<AccessRead<NodeAccess | null>> {
  const { data, error } = await graphService().from("nodes").select("id,visibility,owner_id").eq("id", nodeId).maybeSingle();
  if (error) return { ok: false, reason: "unavailable" };
  if (!data) return { ok: true, value: null };
  return {
    ok: true,
    value: {
      id: data.id as string,
      visibility: readVisibility(data.visibility as string | null),
      ownerId: (data.owner_id as string | null) ?? null,
    },
  };
}

function unavailable(table: string, err: unknown): { ok: false; reason: "unavailable" } {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[research-os/access] ${table} read failed:`, detail);
  return { ok: false, reason: "unavailable" };
}

export async function loadGrants(nodeId: string, client: () => SupabaseClient = graphService): Promise<AccessRead<NodeGrant[]>> {
  const read = await readGrants([nodeId], client);
  return read.ok ? read : unavailable("node_grants", read.error);
}

export async function loadViewerGroups(learnerId: string): Promise<AccessRead<string[]>> {
  const read = await dbAccessStore.groups(learnerId);
  return read.ok ? read : unavailable("class_members", read.error);
}

export async function loadRequestsForNode(nodeId: string): Promise<AccessRead<(AccessRequest & { createdAt: string })[]>> {
  try {
    const rows = await pagedRead<RequestRow>((page) =>
      graphService()
        .from("access_requests")
        .select("id,node_id,requester_id,purpose,message,status,decided_by,decided_at,created_at")
        .eq("node_id", nodeId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: RequestRow[] | null; error: { message: string } | null }>,
    );
    return { ok: true, value: rows.map(requestFromRow) };
  } catch (err) {
    return unavailable("access_requests", err);
  }
}

export async function loadRequestsByRequester(requesterId: string): Promise<AccessRead<(AccessRequest & { createdAt: string })[]>> {
  try {
    const rows = await pagedRead<RequestRow>((page) =>
      graphService()
        .from("access_requests")
        .select("id,node_id,requester_id,purpose,message,status,decided_by,decided_at,created_at")
        .eq("requester_id", requesterId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: RequestRow[] | null; error: { message: string } | null }>,
    );
    return { ok: true, value: rows.map(requestFromRow) };
  } catch (err) {
    return unavailable("access_requests", err);
  }
}

export async function loadOwnedNodes(ownerId: string): Promise<AccessRead<{ id: string; slug: string; title: string; visibility: Visibility }[]>> {
  try {
    const rows = await pagedRead<{ id: string; slug: string; title: string; visibility: Visibility }>((page) =>
      graphService()
        .from("nodes")
        .select("id,slug,title,visibility")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: { id: string; slug: string; title: string; visibility: Visibility }[] | null; error: { message: string } | null }>,
    );
    return { ok: true, value: rows };
  } catch (err) {
    return unavailable("nodes", err);
  }
}

export async function loadPendingCountsForNodes(nodeIds: string[]): Promise<AccessRead<Map<string, number>>> {
  const counts = new Map<string, number>();
  if (nodeIds.length === 0) return { ok: true, value: counts };
  try {
    const rows = await inChunks<{ node_id: string }>(nodeIds, (chunk, page) =>
      graphService()
        .from("access_requests")
        .select("node_id")
        .in("node_id", chunk)
        .eq("status", "pending")
        .order("node_id")
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: { node_id: string }[] | null; error: { message: string } | null }>,
    );
    for (const r of rows) counts.set(r.node_id, (counts.get(r.node_id) ?? 0) + 1);
    return { ok: true, value: counts };
  } catch (err) {
    return unavailable("access_requests", err);
  }
}

export async function setVisibility(node: NodeAccess, actor: Viewer, requested: Visibility): Promise<StoreResult<Visibility>> {
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
): Promise<StoreResult<NodeGrant>> {
  if (!grantAllowed(node, actor, role)) return { ok: false, error: "grant_refused" };
  if (Boolean(grantee.id) === Boolean(grantee.group)) return { ok: false, error: "grantee_required" };
  const row = { node_id: node.id, grantee_id: grantee.id ?? null, grantee_group: grantee.group ?? null, role, granted_by: actor.id, expires_at: expiresAt ?? null };
  const { data, error } = await graphService()
    .from("node_grants")
    .upsert(row, { onConflict: grantee.id ? "node_id,grantee_id,role" : "node_id,grantee_group,role" })
    .select(GRANT_COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: "write_failed" };
  const grant = grantFromRow(data as GrantRow);
  if (!grant) throw new Error(`node_grants: the row written for ${node.id} fails the grant validity rule`);
  return { ok: true, value: grant };
}

export async function revokeGrant(node: NodeAccess, actor: Viewer, grantId: string): Promise<StoreResult<null>> {
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
): Promise<StoreResult<AccessRequest & { createdAt: string }>> {
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
): Promise<StoreResult<{ request: AccessRequest; grant: NodeGrant | null }>> {
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
): Promise<StoreResult<{ importId: string; nodeId: string; fetched: boolean }>> {
  const svc = graphService();
  const slug = `import-${ownerId.slice(0, 8)}-${Date.now().toString(36)}`;
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
