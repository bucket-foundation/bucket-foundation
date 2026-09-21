/**
 * One read-authorization adapter for Research OS, over the rules in
 * access.ts and the rows in access-db.ts (ros-ai-access,
 * learning/research-os/ai/IMPLEMENTATION.md, "Authorization boundary").
 *
 * The routes that read graph rows through the service-role client each
 * carried their own check, or none: GET search filtered on public-or-owner
 * and never loaded a grant, so a node shared with a learner was invisible
 * to them and a revoked grant was indistinguishable from a live one.
 * Quote, Locate and the Check phases read whatever id they were handed.
 *
 * Three rules this adapter keeps that the loaders under it do not:
 *
 *   1. An access-store failure is `unavailable`, never "no grants". The
 *      helpers in access-db.ts collapse an error into an empty list, which
 *      reads as a denial and hides an outage.
 *   2. A visibility the code does not know is private. The column is
 *      NOT NULL with a three-value check today, so this is insurance.
 *   3. Reads are batched: one query for the nodes, one for their grants,
 *      one for the viewer's groups, whatever the result count.
 *
 * The store is injectable so the rules can be tested without a database.
 */
import { can, canView, type GrantRole, type NodeAccess, type NodeGrant, type Viewer, type Visibility } from "./access";
import { graphService } from "./db";

/** What a read can ask for. `view` is the floor; the rest are grant roles. */
export type ReadVerb = GrantRole;

export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The rows the adapter needs, each read as a whole or reported as a failure. */
export interface AccessStore {
  nodes(ids: string[]): Promise<StoreResult<NodeAccess[]>>;
  grants(ids: string[]): Promise<StoreResult<NodeGrant[]>>;
  groups(learnerId: string): Promise<StoreResult<string[]>>;
}

export type Authorized = {
  ok: true;
  /** The ids the viewer may act on with the verb asked for, in input order. */
  allowed: string[];
  /** Every id that exists, with the access row it was judged on. */
  nodes: Map<string, NodeAccess>;
  /** The ids that no node row matched. */
  missing: string[];
};

export type Unavailable = { ok: false; reason: "unavailable"; detail: string };

export type AuthorizeResult = Authorized | Unavailable;

const KNOWN_VISIBILITY: Visibility[] = ["public", "private", "shared"];

/** A visibility this code does not know is treated as private. */
export function readVisibility(value: string | null | undefined): Visibility {
  return KNOWN_VISIBILITY.includes(value as Visibility) ? (value as Visibility) : "private";
}

/** A grant whose expiry cannot be read is treated as expired. */
function liveGrant(grant: NodeGrant, now: Date): boolean {
  if (!grant.expiresAt) return true;
  const at = Date.parse(grant.expiresAt);
  return Number.isFinite(at) && at > now.getTime();
}

function chunk<T>(items: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** The store the routes use: the service-role client, errors preserved. */
export const dbAccessStore: AccessStore = {
  async nodes(ids) {
    const rows: NodeAccess[] = [];
    for (const part of chunk(ids)) {
      const { data, error } = await graphService().from("nodes").select("id,visibility,owner_id").in("id", part);
      if (error) return { ok: false, error: `nodes: ${error.message}` };
      for (const r of (data as { id: string; visibility: string | null; owner_id: string | null }[]) || []) {
        rows.push({ id: r.id, visibility: readVisibility(r.visibility), ownerId: r.owner_id ?? null });
      }
    }
    return { ok: true, value: rows };
  },
  async grants(ids) {
    const rows: NodeGrant[] = [];
    for (const part of chunk(ids)) {
      const { data, error } = await graphService()
        .from("node_grants")
        .select("id,node_id,grantee_id,grantee_group,role,expires_at")
        .in("node_id", part);
      if (error) return { ok: false, error: `grants: ${error.message}` };
      for (const r of (data as {
        id: string;
        node_id: string;
        grantee_id: string | null;
        grantee_group: string | null;
        role: string;
        expires_at: string | null;
      }[]) || []) {
        rows.push({
          id: r.id,
          nodeId: r.node_id,
          granteeId: r.grantee_id ?? null,
          granteeGroup: r.grantee_group ?? null,
          role: r.role as GrantRole,
          expiresAt: r.expires_at ?? null,
        });
      }
    }
    return { ok: true, value: rows };
  },
  async groups(learnerId) {
    const { data, error } = await graphService().from("class_members").select("class_id").eq("learner_id", learnerId);
    if (error) return { ok: false, error: `groups: ${error.message}` };
    return { ok: true, value: ((data as { class_id: string }[]) || []).map((r) => `class:${r.class_id}`) };
  },
};

/**
 * Whether a viewer may act on each of these nodes with one verb.
 *
 * An id the store has no row for lands in `missing` rather than in
 * `allowed`, so a caller can tell a hidden node from one that never
 * existed without telling the viewer which it was.
 */
export async function authorizeNodes(
  ids: string[],
  viewer: Viewer,
  verb: ReadVerb,
  store: AccessStore = dbAccessStore,
  now: Date = new Date(),
): Promise<AuthorizeResult> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return { ok: true, allowed: [], nodes: new Map(), missing: [] };

  const nodes = await store.nodes(unique);
  if (!nodes.ok) return { ok: false, reason: "unavailable", detail: nodes.error };

  const byId = new Map(nodes.value.map((n) => [n.id, n]));
  const missing = unique.filter((id) => !byId.has(id));

  // A public node needs no grant and no group, so a viewer reading public
  // rows costs one query. Anything else loads both.
  const needsGrants = nodes.value.some((n) => n.visibility !== "public") || verb !== "view";
  let grants: NodeGrant[] = [];
  let groups: string[] = [];
  if (needsGrants) {
    const loaded = await store.grants(unique);
    if (!loaded.ok) return { ok: false, reason: "unavailable", detail: loaded.error };
    grants = loaded.value.filter((g) => liveGrant(g, now));
    if (viewer.id) {
      const inGroups = await store.groups(viewer.id);
      if (!inGroups.ok) return { ok: false, reason: "unavailable", detail: inGroups.error };
      groups = inGroups.value;
    }
  }

  const subject: Viewer = { id: viewer.id, groups: viewer.groups ?? groups };
  const allowed = unique.filter((id) => {
    const node = byId.get(id);
    if (!node) return false;
    return verb === "view" ? canView(node, subject, grants, now) : can(node, subject, verb, grants, now);
  });

  return { ok: true, allowed, nodes: byId, missing };
}

/**
 * A store that answers `nodes` from rows a caller already read, and passes
 * grants and groups through. A route that selected visibility and owner
 * with its own query authorizes without reading those rows twice.
 */
export function storeWithNodes(rows: NodeAccess[], base: AccessStore = dbAccessStore): AccessStore {
  const byId = new Map(rows.map((n) => [n.id, n]));
  return {
    async nodes(ids) {
      return { ok: true, value: ids.map((id) => byId.get(id)).filter((n): n is NodeAccess => Boolean(n)) };
    },
    grants: base.grants.bind(base),
    groups: base.groups.bind(base),
  };
}

export type OneResult =
  | { ok: true; node: NodeAccess }
  | { ok: false; reason: "denied" | "not_found" | "unavailable"; detail?: string };

/**
 * One node, one verb. `denied` and `not_found` are separate here so a
 * route can log which it was; both answer 404 to the caller, so a hidden
 * node cannot be told from one that does not exist.
 */
export async function authorizeNode(
  id: string,
  viewer: Viewer,
  verb: ReadVerb,
  store: AccessStore = dbAccessStore,
  now: Date = new Date(),
): Promise<OneResult> {
  const result = await authorizeNodes([id], viewer, verb, store, now);
  if (!result.ok) return { ok: false, reason: "unavailable", detail: result.detail };
  if (result.missing.includes(id)) return { ok: false, reason: "not_found" };
  const node = result.nodes.get(id);
  if (!node || !result.allowed.includes(id)) return { ok: false, reason: "denied" };
  return { ok: true, node };
}
