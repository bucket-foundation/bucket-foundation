/**
 * Research OS, the Access level (ros-21).
 *
 * GET  /api/research-os/access?node=<id>
 *   { node: {id, visibility, ownerId}, isOwner, canView, verbs: {continue,
 *     extend, cite, replicate, review}, grants (owner only), requests (owner
 *     only), myRequests }
 * GET  /api/research-os/access?mine=1
 *   { owned: [{id, slug, title, visibility, pending}], myRequests }
 * POST /api/research-os/access
 *   { action: "set_visibility", nodeId, visibility }
 *   { action: "grant", nodeId, granteeId | granteeGroup, role, expiresAt? }
 *   { action: "revoke", nodeId, grantId }
 *   { action: "request", nodeId, purpose, message? }
 *   { action: "decide", nodeId, requestId, decision: "granted" | "denied" }
 *   { action: "import", kind, title, source? }
 *
 * Auth: Authorization: Bearer <supabase access token>. GET ?node= works
 * signed out for public nodes (verbs computed for an anonymous viewer).
 * Rules: src/lib/research-os/access.ts. Writes: access-db.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, verifyLearner } from "@/lib/research-os/db";
import { can, canView, isOwner, GRANT_ROLES, type GrantRole, type RequestPurpose, type Viewer, type Visibility } from "@/lib/research-os/access";
import {
  createImport,
  createRequest,
  decideAccessRequest,
  grantAccess,
  loadGrants,
  loadNodeAccess,
  loadOwnedNodes,
  loadRequestsByRequester,
  loadRequestsForNode,
  loadViewerGroups,
  revokeGrant,
  setVisibility,
} from "@/lib/research-os/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}

const VISIBILITIES: Visibility[] = ["public", "private", "shared"];
const PURPOSES: RequestPurpose[] = ["continue", "extend", "cite", "replicate", "review"];

async function viewerFrom(req: NextRequest): Promise<{ ok: true; viewer: Viewer } | { ok: false }> {
  const id = await verifyLearner(req);
  if (!id) return { ok: true, viewer: { id: null, groups: [] } };
  const groups = await loadViewerGroups(id);
  // A failed groups read is not a learner in no class. Answering one
  // tells a group grantee they have no access, behind a 200.
  if (!groups.ok) return { ok: false };
  return { ok: true, viewer: { id, groups: groups.value } };
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const { searchParams } = new URL(req.url);
  const viewerRead = await viewerFrom(req);
  if (!viewerRead.ok) return bad(503, "access_unavailable");
  const viewer = viewerRead.viewer;

  if (searchParams.get("mine")) {
    if (!viewer.id) return bad(401, "unauthorized");
    const owned = await loadOwnedNodes(viewer.id);
    const withPending = await Promise.all(
      owned.map(async (n) => ({ ...n, pending: (await loadRequestsForNode(n.id)).filter((r) => r.status === "pending").length }))
    );
    return NextResponse.json({ owned: withPending, myRequests: await loadRequestsByRequester(viewer.id) }, NO_STORE);
  }

  const nodeId = searchParams.get("node");
  if (!nodeId) return bad(400, "node_required");
  const nodeRead = await loadNodeAccess(nodeId);
  if (!nodeRead.ok) return bad(503, "access_unavailable");
  const node = nodeRead.value;
  if (!node) return bad(404, "not_found");
  const grantsRead = await loadGrants(nodeId);
  if (!grantsRead.ok) return bad(503, "access_unavailable");
  const grants = grantsRead.value;
  const owner = isOwner(node, viewer);
  const verbs = Object.fromEntries(GRANT_ROLES.filter((r) => r !== "view").map((r) => [r, can(node, viewer, r as GrantRole, grants)]));
  return NextResponse.json(
    {
      node,
      isOwner: owner,
      canView: canView(node, viewer, grants),
      verbs,
      grants: owner ? grants : undefined,
      requests: owner ? await loadRequestsForNode(nodeId) : undefined,
      myRequests: viewer.id ? (await loadRequestsByRequester(viewer.id)).filter((r) => r.nodeId === nodeId) : [],
    },
    NO_STORE
  );
}

type Body =
  | { action: "set_visibility"; nodeId: string; visibility: Visibility }
  | { action: "grant"; nodeId: string; granteeId?: string; granteeGroup?: string; role: GrantRole; expiresAt?: string | null }
  | { action: "revoke"; nodeId: string; grantId: string }
  | { action: "request"; nodeId: string; purpose: RequestPurpose; message?: string }
  | { action: "decide"; nodeId: string; requestId: string; decision: "granted" | "denied" }
  | { action: "import"; kind: "dataset" | "paper" | "notes" | "corpus"; title: string; source?: Record<string, unknown> };

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const viewerRead = await viewerFrom(req);
  if (!viewerRead.ok) return bad(503, "access_unavailable");
  const viewer = viewerRead.viewer;
  if (!viewer.id) return bad(401, "unauthorized");
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad(400, "bad_json");
  }
  if (!body || typeof body !== "object" || !("action" in body)) return bad(400, "action_required");

  if (body.action === "import") {
    if (!["dataset", "paper", "notes", "corpus"].includes(body.kind) || !body.title?.trim()) return bad(400, "kind_and_title_required");
    const r = await createImport(viewer.id, { kind: body.kind, title: body.title.trim().slice(0, 200), source: body.source });
    return r.ok ? NextResponse.json(r.value, NO_STORE) : bad(500, r.error);
  }

  const nodeRead = await loadNodeAccess(body.nodeId);
  if (!nodeRead.ok) return bad(503, "access_unavailable");
  const node = nodeRead.value;
  if (!node) return bad(404, "not_found");

  switch (body.action) {
    case "set_visibility": {
      if (!VISIBILITIES.includes(body.visibility)) return bad(400, "bad_visibility");
      const r = await setVisibility(node, viewer, body.visibility);
      return r.ok ? NextResponse.json({ visibility: r.value }, NO_STORE) : bad(r.error === "not_owner" ? 403 : 500, r.error);
    }
    case "grant": {
      if (!GRANT_ROLES.includes(body.role)) return bad(400, "bad_role");
      const r = await grantAccess(node, viewer, { id: body.granteeId, group: body.granteeGroup }, body.role, body.expiresAt);
      return r.ok ? NextResponse.json({ grant: r.value }, NO_STORE) : bad(r.error === "write_failed" ? 500 : 403, r.error);
    }
    case "revoke": {
      const r = await revokeGrant(node, viewer, body.grantId);
      return r.ok ? NextResponse.json({ ok: true }, NO_STORE) : bad(r.error === "not_owner" ? 403 : 500, r.error);
    }
    case "request": {
      if (!PURPOSES.includes(body.purpose)) return bad(400, "bad_purpose");
      const grantsRead = await loadGrants(node.id);
      if (!grantsRead.ok) return bad(503, "access_unavailable");
      const grants = grantsRead.value;
      const r = await createRequest(node, viewer, body.purpose, body.message?.trim().slice(0, 1000) || null, grants);
      if (r.ok) return NextResponse.json({ request: r.value }, NO_STORE);
      return bad(r.error === "already_pending" ? 409 : r.error === "request_refused" ? 403 : 500, r.error);
    }
    case "decide": {
      if (body.decision !== "granted" && body.decision !== "denied") return bad(400, "bad_decision");
      const r = await decideAccessRequest(node, viewer, body.requestId, body.decision);
      if (r.ok) return NextResponse.json(r.value, NO_STORE);
      return bad(r.error === "not_found" ? 404 : r.error === "decide_refused" ? 403 : 500, r.error);
    }
    default:
      return bad(400, "unknown_action");
  }
}
