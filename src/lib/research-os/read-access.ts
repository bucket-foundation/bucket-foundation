import { can, canView, GRANT_ROLES, live, readVisibility, type GrantRole, type NodeAccess, type NodeGrant, type Viewer, type Visibility } from "./access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { graphService } from "./db";
import { inChunks, pagedRead } from "./paging";

export type ReadVerb = GrantRole;

export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface AccessStore {
  nodes(ids: string[]): Promise<StoreResult<NodeAccess[]>>;
  grants(ids: string[]): Promise<StoreResult<NodeGrant[]>>;
  groups(learnerId: string): Promise<StoreResult<string[]>>;
}

export type Authorized = {
  ok: true;
  allowed: string[];
  nodes: Map<string, NodeAccess>;
  missing: string[];
};

export type Unavailable = { ok: false; reason: "unavailable"; detail: string };

export type AuthorizeResult = Authorized | Unavailable;

const VISIBILITY_RANK: Record<Visibility, number> = { public: 0, shared: 1, private: 2 };

function strictestById(nodes: NodeAccess[]): Map<string, NodeAccess> {
  const byId = new Map<string, NodeAccess>();
  for (const node of nodes) {
    const held = byId.get(node.id);
    if (!held || VISIBILITY_RANK[node.visibility] > VISIBILITY_RANK[held.visibility]) byId.set(node.id, node);
  }
  return byId;
}

export { readVisibility };

const liveGrant = live;

export type GrantRow = {
  id: string;
  node_id: string;
  grantee_id: string | null;
  grantee_group: string | null;
  role: string;
  expires_at: string | null;
};

export const GRANT_COLUMNS = "id,node_id,grantee_id,grantee_group,role,expires_at";

export function grantFromRow(r: GrantRow): NodeGrant | null {
  if (!GRANT_ROLES.includes(r.role as GrantRole)) return null;
  if (r.grantee_id && r.grantee_group) return null;
  return {
    id: r.id,
    nodeId: r.node_id,
    granteeId: r.grantee_id ?? null,
    granteeGroup: r.grantee_group ?? null,
    role: r.role as GrantRole,
    expiresAt: r.expires_at ?? null,
  };
}

type Page<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;

function failure(what: string, err: unknown): { ok: false; error: string } {
  return { ok: false, error: `${what}: ${err instanceof Error ? err.message : String(err)}` };
}

export async function readGrants(ids: string[], client: () => SupabaseClient = graphService): Promise<StoreResult<NodeGrant[]>> {
  try {
    const rows = await inChunks<GrantRow>(ids, (part, page) =>
      client().from("node_grants").select(GRANT_COLUMNS).in("node_id", part).order("id", { ascending: true }).range(page.from, page.to) as unknown as Page<GrantRow>,
    );
    return { ok: true, value: rows.map(grantFromRow).filter((g): g is NodeGrant => g !== null) };
  } catch (err) {
    return failure("grants", err);
  }
}

export const dbAccessStore: AccessStore = {
  async nodes(ids) {
    try {
      const rows = await inChunks<{ id: string; visibility: string | null; owner_id: string | null }>(ids, (part, page) =>
        graphService().from("nodes").select("id,visibility,owner_id").in("id", part).order("id", { ascending: true }).range(page.from, page.to) as unknown as Page<{
          id: string;
          visibility: string | null;
          owner_id: string | null;
        }>,
      );
      return { ok: true, value: rows.map((r) => ({ id: r.id, visibility: readVisibility(r.visibility), ownerId: r.owner_id ?? null })) };
    } catch (err) {
      return failure("nodes", err);
    }
  },
  grants: (ids) => readGrants(ids),
  async groups(learnerId) {
    try {
      const rows = await pagedRead<{ class_id: string }>((page) =>
        graphService().from("class_members").select("class_id").eq("learner_id", learnerId).order("class_id", { ascending: true }).range(page.from, page.to) as unknown as Page<{
          class_id: string;
        }>,
      );
      return { ok: true, value: rows.map((r) => `class:${r.class_id}`) };
    } catch (err) {
      return failure("groups", err);
    }
  },
};

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

  const byId = strictestById(nodes.value);
  const missing = unique.filter((id) => !byId.has(id));

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

  const subject: Viewer = { id: viewer.id, groups: Array.from(new Set([...(viewer.groups ?? []), ...groups])) };
  const allowed = unique.filter((id) => {
    const node = byId.get(id);
    if (!node) return false;
    return verb === "view" ? canView(node, subject, grants, now) : can(node, subject, verb, grants, now);
  });

  return { ok: true, allowed, nodes: byId, missing };
}

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

export type VerbsResult =
  | { ok: true; node: NodeAccess; allowed: Record<ReadVerb, boolean> }
  | { ok: false; reason: "denied" | "not_found" | "unavailable"; detail?: string };

export async function authorizeVerbs(
  id: string,
  viewer: Viewer,
  verbs: ReadVerb[],
  store: AccessStore = dbAccessStore,
  now: Date = new Date(),
): Promise<VerbsResult> {
  const nodes = await store.nodes([id]);
  if (!nodes.ok) return { ok: false, reason: "unavailable", detail: nodes.error };
  const node = strictestById(nodes.value).get(id);
  if (!node) return { ok: false, reason: "not_found" };

  const onlyView = node.visibility === "public" && verbs.every((v) => v === "view");
  let grants: NodeGrant[] = [];
  let groups: string[] = [];
  if (!onlyView) {
    const loadedGrants = await store.grants([id]);
    if (!loadedGrants.ok) return { ok: false, reason: "unavailable", detail: loadedGrants.error };
    grants = loadedGrants.value.filter((g) => liveGrant(g, now));
    if (viewer.id) {
      const inGroups = await store.groups(viewer.id);
      if (!inGroups.ok) return { ok: false, reason: "unavailable", detail: inGroups.error };
      groups = inGroups.value;
    }
  }
  const subject: Viewer = { id: viewer.id, groups: Array.from(new Set([...(viewer.groups ?? []), ...groups])) };

  const allowed = {} as Record<ReadVerb, boolean>;
  for (const verb of verbs) {
    allowed[verb] = verb === "view" ? canView(node, subject, grants, now) : can(node, subject, verb, grants, now);
  }
  if (!allowed.view && verbs.includes("view")) return { ok: false, reason: "denied" };
  return { ok: true, node, allowed };
}

export type OneResult =
  | { ok: true; node: NodeAccess }
  | { ok: false; reason: "denied" | "not_found" | "unavailable"; detail?: string };

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
