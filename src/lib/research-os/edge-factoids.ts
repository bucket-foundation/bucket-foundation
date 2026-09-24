import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "./access";
import { authorizeNodes, type AccessStore, type ReadVerb, dbAccessStore } from "./read-access";

export interface EdgeFactoidRow {
  id: string;
  edge_id: string;
  role: string;
  from_id: string;
  to_id: string;
}

export type EdgeFactoidRead<T> = { ok: true; rows: T[] } | { ok: false; reason: "unavailable"; detail: string };

export async function authorizeEdgeFactoids<T extends EdgeFactoidRow>(
  rows: T[],
  viewer: Viewer,
  verb: ReadVerb = "view",
  store: AccessStore = dbAccessStore,
  now: Date = new Date(),
): Promise<EdgeFactoidRead<T>> {
  if (rows.length === 0) return { ok: true, rows: [] };
  const ids = rows.flatMap((r) => [r.from_id, r.to_id]);
  const auth = await authorizeNodes(ids, viewer, verb, store, now);
  if (!auth.ok) return { ok: false, reason: "unavailable", detail: auth.detail };
  const allowed = new Set(auth.allowed);
  return { ok: true, rows: rows.filter((r) => allowed.has(r.from_id) && allowed.has(r.to_id)) };
}

export type PurgeOutcome =
  | { status: 200; body: { ok: true; factoids: number; lineage: number } }
  | { status: 404; body: { error: "edge_not_found" } }
  | { status: 409; body: { error: "factoids_not_withdrawn"; message: string } }
  | { status: 503; body: { error: "purge_unavailable" } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEdgeId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export async function purgeEdgeFactoids(svc: SupabaseClient, edgeId: string, reviewerId: string): Promise<PurgeOutcome> {
  const { data, error } = await svc.rpc("purge_edge_factoids", { p_edge: edgeId, p_reviewer: reviewerId });
  if (error) {
    if (error.code === "23514") return { status: 409, body: { error: "factoids_not_withdrawn", message: "Withdraw every factoid on the edge before purging it." } };
    return { status: 503, body: { error: "purge_unavailable" } };
  }
  const r = (data ?? {}) as { ok?: boolean; error?: string; factoids?: number; lineage?: number };
  if (r.ok !== true) return { status: 404, body: { error: "edge_not_found" } };
  return { status: 200, body: { ok: true, factoids: Number(r.factoids ?? 0), lineage: Number(r.lineage ?? 0) } };
}
