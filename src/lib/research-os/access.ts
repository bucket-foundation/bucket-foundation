/**
 * Research OS, the Access level (ros-21). Pure rules, no I/O: who can see
 * and act on a node given its visibility, its owner, and the grants on it.
 * Mirrors supabase/migrations/20260915000000_research_os_access.sql; the
 * DB wrappers live in access-db.ts and the route in
 * src/app/api/research-os/access/route.ts.
 *
 * The model, from learning/research-os/INTEGRATION-PLAN.md section 2:
 * a node is public, private, or shared with named people or groups, the
 * way a repository or a drive works. A person asks for a role, the owner
 * grants it. Roles are the verbs the plan names.
 */

export type Visibility = "public" | "private" | "shared";

/** What a grant lets a person do. `view` reads; the rest each imply view. */
export type GrantRole = "view" | "continue" | "extend" | "cite" | "replicate" | "review";

export const GRANT_ROLES: GrantRole[] = ["view", "continue", "extend", "cite", "replicate", "review"];

/** Purposes a request can name; the same verbs minus plain viewing, since a
 * request always asks to do something with the node. */
export type RequestPurpose = Exclude<GrantRole, "view">;

export type RequestStatus = "pending" | "granted" | "denied";

export interface NodeAccess {
  id: string;
  visibility: Visibility;
  ownerId: string | null;
}

export interface NodeGrant {
  id?: string;
  nodeId: string;
  granteeId?: string | null;
  /** 'class:<uuid>' or 'role:<name>' */
  granteeGroup?: string | null;
  role: GrantRole;
  expiresAt?: string | null;
}

export interface AccessRequest {
  id?: string;
  nodeId: string;
  requesterId: string;
  purpose: RequestPurpose;
  message?: string | null;
  status: RequestStatus;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

/** The viewer as the rules see them: an id and the groups they belong to. */
export interface Viewer {
  id: string | null;
  groups?: string[];
}

/**
 * A grant with no expiry never expires. An expiry this code cannot read is
 * treated as expired: read-access.ts judged it that way and this file
 * judged it live, so the same row admitted a learner on one route and
 * denied them on another (Bucket critic C2).
 */
function live(grant: NodeGrant, now: Date): boolean {
  if (!grant.expiresAt) return true;
  const t = Date.parse(grant.expiresAt);
  return Number.isFinite(t) && t > now.getTime();
}

function grantsFor(viewer: Viewer, grants: NodeGrant[], nodeId: string, now: Date): NodeGrant[] {
  const groups = new Set(viewer.groups ?? []);
  return grants.filter(
    (g) =>
      g.nodeId === nodeId &&
      live(g, now) &&
      ((g.granteeId && g.granteeId === viewer.id) || (g.granteeGroup && groups.has(g.granteeGroup)))
  );
}

export function isOwner(node: NodeAccess, viewer: Viewer): boolean {
  return Boolean(viewer.id && node.ownerId && viewer.id === node.ownerId);
}

/** Any grant at all implies view. */
export function canView(node: NodeAccess, viewer: Viewer, grants: NodeGrant[] = [], now: Date = new Date()): boolean {
  if (node.visibility === "public") return true;
  if (isOwner(node, viewer)) return true;
  if (node.visibility === "private") return false;
  return grantsFor(viewer, grants, node.id, now).length > 0;
}

/**
 * Whether the viewer may act on the node with a given verb. Public nodes
 * let anyone continue, extend, cite, and replicate; review on a public node
 * still needs a grant (review is a named role on the canon, see
 * canon-signoff.ts). Shared nodes need the matching role or a role that
 * implies it; private nodes are the owner's alone.
 */
export function can(
  node: NodeAccess,
  viewer: Viewer,
  action: GrantRole,
  grants: NodeGrant[] = [],
  now: Date = new Date()
): boolean {
  if (isOwner(node, viewer)) return true;
  if (action === "view") return canView(node, viewer, grants, now);
  if (node.visibility === "public") return action !== "review" || hasRole(viewer, grants, node.id, "review", now);
  if (node.visibility === "private") return false;
  return hasRole(viewer, grants, node.id, action, now);
}

function hasRole(viewer: Viewer, grants: NodeGrant[], nodeId: string, role: GrantRole, now: Date): boolean {
  return grantsFor(viewer, grants, nodeId, now).some((g) => g.role === role);
}

/** The ids of the nodes a viewer may see, in input order. */
export function visibleNodeIds(nodes: NodeAccess[], viewer: Viewer, grants: NodeGrant[] = [], now: Date = new Date()): string[] {
  return nodes.filter((n) => canView(n, viewer, grants, now)).map((n) => n.id);
}

/** Only the owner changes visibility. Returns the value to store, or null when refused. */
export function nextVisibility(node: NodeAccess, actor: Viewer, requested: Visibility): Visibility | null {
  if (!isOwner(node, actor)) return null;
  return requested;
}

/** Only the owner grants. A grant on a public node is meaningful only for
 * review; every other role is already open, so the grant is refused. */
export function grantAllowed(node: NodeAccess, actor: Viewer, role: GrantRole): boolean {
  if (!isOwner(node, actor)) return false;
  if (node.visibility === "public") return role === "review";
  return true;
}

/** A request is allowed when the requester cannot already do the thing and
 * the node is shared, or private with a known owner to ask. */
export function requestAllowed(node: NodeAccess, requester: Viewer, purpose: RequestPurpose, grants: NodeGrant[] = [], now: Date = new Date()): boolean {
  if (!requester.id) return false;
  if (isOwner(node, requester)) return false;
  if (can(node, requester, purpose, grants, now)) return false;
  return Boolean(node.ownerId);
}

/** The owner decides. Returns the grant to write on a grant decision. */
export function decideRequest(
  node: NodeAccess,
  request: AccessRequest,
  actor: Viewer,
  decision: "granted" | "denied",
  now: Date = new Date()
): { request: AccessRequest; grant: NodeGrant | null } | null {
  if (!isOwner(node, actor)) return null;
  if (request.status !== "pending") return null;
  const decided: AccessRequest = { ...request, status: decision, decidedBy: actor.id, decidedAt: now.toISOString() };
  const grant: NodeGrant | null =
    decision === "granted" ? { nodeId: node.id, granteeId: request.requesterId, role: request.purpose } : null;
  return { request: decided, grant };
}
