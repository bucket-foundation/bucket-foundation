export type Visibility = "public" | "private" | "shared";

const KNOWN_VISIBILITY: Visibility[] = ["public", "private", "shared"];

export function readVisibility(value: string | null | undefined): Visibility {
  return KNOWN_VISIBILITY.includes(value as Visibility) ? (value as Visibility) : "private";
}

export type GrantRole = "view" | "continue" | "extend" | "cite" | "replicate" | "review";

export const GRANT_ROLES: GrantRole[] = ["view", "continue", "extend", "cite", "replicate", "review"];

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

export interface Viewer {
  id: string | null;
  groups?: string[];
}

export function live(grant: NodeGrant, now: Date): boolean {
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

export function canView(node: NodeAccess, viewer: Viewer, grants: NodeGrant[] = [], now: Date = new Date()): boolean {
  if (node.visibility === "public") return true;
  if (isOwner(node, viewer)) return true;
  if (node.visibility === "private") return false;
  return grantsFor(viewer, grants, node.id, now).length > 0;
}

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

export function visibleNodeIds(nodes: NodeAccess[], viewer: Viewer, grants: NodeGrant[] = [], now: Date = new Date()): string[] {
  return nodes.filter((n) => canView(n, viewer, grants, now)).map((n) => n.id);
}

export function nextVisibility(node: NodeAccess, actor: Viewer, requested: Visibility): Visibility | null {
  if (!isOwner(node, actor)) return null;
  return requested;
}

export function grantAllowed(node: NodeAccess, actor: Viewer, role: GrantRole): boolean {
  if (!isOwner(node, actor)) return false;
  if (node.visibility === "public") return role === "review";
  return true;
}

export function requestAllowed(node: NodeAccess, requester: Viewer, purpose: RequestPurpose, grants: NodeGrant[] = [], now: Date = new Date()): boolean {
  if (!requester.id) return false;
  if (isOwner(node, requester)) return false;
  if (can(node, requester, purpose, grants, now)) return false;
  return Boolean(node.ownerId);
}

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
