/**
 * Research OS, the Access level, server-only DB access (ros-21). Same
 * contract as db.ts: a route verifies the caller with verifyLearner(), then
 * these wrappers read and write through the service-role client bound to
 * the private `graph` schema, applying the rules in access.ts before any
 * write. Never import from a client component.
 */
import { graphService, inChunks, pagedRead } from "./db";
import { authorizeNodes, dbAccessStore, readVisibility, storeWithNodes, type AccessStore } from "./read-access";
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
 * The result is a union, so a caller cannot read the nodes without
 * deciding what an outage means. An optional `unavailable` flag let one of
 * the four callers serve an empty neighbourhood with a 200 (Bucket critic
 * C13); the compiler now names every caller that has to choose.
 */
export type SubgraphForViewer<N, E> = { ok: true; nodes: N[]; edges: E[] } | { ok: false; reason: "unavailable" };

export async function filterSubgraphForViewer<N extends { id: string; visibility?: Visibility; ownerId?: string | null }, E extends { fromId: string; toId: string }>(
  nodes: N[],
  edges: E[],
  viewerId: string | null,
  // The grants and groups come from here. It is the database in every
  // caller; a test supplies its own so the rule below can be checked
  // without one.
  store: AccessStore = dbAccessStore,
): Promise<SubgraphForViewer<N, E>> {
  // readVisibility, so a node whose visibility this code cannot read is
  // non-public and goes through the decision below. `?? "public"` let a
  // node with no visibility skip authorization, and a caller that built
  // its nodes by hand got every one of them back.
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

/**
 * These three read what `/api/research-os/access` decides on, and all
 * three broke the two rules `read-access.ts` exists to enforce. An
 * unknown or null visibility became `public`, which is the inverse of
 * "a visibility this code does not know is private". A failed grants or
 * groups read became an empty list, which is the inverse of "an
 * access-store failure is unavailable, never no grants".
 *
 * Each now answers a result, so the route has to decide what an outage
 * means rather than being handed a denial that looks like an answer.
 */
export type AccessRead<T> = { ok: true; value: T } | { ok: false; reason: "unavailable" };

export async function loadNodeAccess(nodeId: string): Promise<AccessRead<NodeAccess | null>> {
  const { data, error } = await graphService().from("nodes").select("id,visibility,owner_id").eq("id", nodeId).maybeSingle();
  if (error) return { ok: false, reason: "unavailable" };
  if (!data) return { ok: true, value: null };
  return {
    ok: true,
    value: {
      id: data.id as string,
      // readVisibility, so a visibility this code does not know is
      // private. `?? "public"` made an unknown value world-readable.
      visibility: readVisibility(data.visibility as string | null),
      ownerId: (data.owner_id as string | null) ?? null,
    },
  };
}

/**
 * Both of these decide access, and both took one unpaged request.
 * PostgREST stops at a thousand rows and reports no error, so the grant
 * that admits you is dropped when you are the 1,001st grantee of a node
 * and the answer reads as a complete list of grants that excludes you.
 * That is the row cap producing a denial rather than a truncation.
 *
 * pagedRead throws where the builder answers an error. A caller of
 * these two reads a union, so the throw is turned back into the
 * unavailable it already knows how to answer.
 */
/**
 * An outage, said out loud.
 *
 * Both callers answer a union, so the throw becomes the `unavailable`
 * the route already knows how to turn into a 503. A bare `catch {}`
 * made that silent, and it hides more than an outage: graphService()
 * throwing on an unconfigured stack, a TypeError in the callback, and a
 * PagingError, which means 200,000 rows of database work ran without
 * terminating and every retry the 503 invites runs them again. The log
 * is the only place that distinction survives.
 */
function unavailable(table: string, err: unknown): { ok: false; reason: "unavailable" } {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[research-os/access] ${table} read failed:`, detail);
  return { ok: false, reason: "unavailable" };
}

export async function loadGrants(nodeId: string): Promise<AccessRead<NodeGrant[]>> {
  try {
    const rows = await pagedRead<GrantRow>((page) =>
      graphService()
        .from("node_grants")
        .select("id,node_id,grantee_id,grantee_group,role,expires_at")
        .eq("node_id", nodeId)
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: GrantRow[] | null; error: { message: string } | null }>,
    );
    return { ok: true, value: rows.map(grantFromRow) };
  } catch (err) {
    return unavailable("node_grants", err);
  }
}

/** The class groups a learner belongs to, as 'class:<id>' strings, for group grants. */
export async function loadViewerGroups(learnerId: string): Promise<AccessRead<string[]>> {
  try {
    const rows = await pagedRead<{ class_id: string }>((page) =>
      graphService()
        .from("class_members")
        .select("class_id")
        .eq("learner_id", learnerId)
        .order("class_id")
        .range(page.from, page.to) as unknown as Promise<{ data: { class_id: string }[] | null; error: { message: string } | null }>,
    );
    return { ok: true, value: rows.map((r) => `class:${r.class_id}`) };
  } catch (err) {
    return unavailable("class_members", err);
  }
}

/**
 * These three read what /api/research-os/access serves, and each was one
 * unpaged request answering `[]` on error, under a header saying every
 * read in this file had stopped doing that.
 *
 * Both failures are quiet. A node past a thousand access requests showed
 * its owner a truncated queue, and `created_at` carries no unique index,
 * so the truncation point was not even stable between requests. During a
 * Postgres outage all three rendered "you own nothing, nobody has asked"
 * behind a 200.
 *
 * They page on `(created_at, id)` and `(id)`, and they answer the union
 * the rest of this file answers.
 */
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

/**
 * Pending access requests per node, for a list of nodes, in one paged
 * read per chunk.
 *
 * The owned-nodes view counted these with one request per node inside a
 * Promise.all, so an owner with 800 nodes opened 800 concurrent
 * PostgREST connections from a single GET to compute 800 integers.
 */
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
