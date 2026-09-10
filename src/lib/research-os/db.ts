/**
 * Research OS for K-12, Phase 0, server-only DB access (bkt-ros).
 * Same shape as /api/academy/progress (src/app/api/academy/progress/route.ts):
 * the `graph` schema is private, outside the shared PostgREST's
 * PGRST_DB_SCHEMAS allow-list, so every API route under /api/research-os/*
 * verifies the caller's Supabase access token with the public anon key, then
 * uses a server-only service-role client to read/write ONLY that verified
 * user's rows. The service-role key bypasses RLS; the per-user boundary is
 * enforced here, in application code, with the migration's RLS policies as
 * defense in depth. Never import this module from a client component.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { GraphNode, GraphEdge, LearnerNodeState } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function configured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

let _svc: SupabaseClient | null = null;
/** Service-role client bound to the private `graph` schema (memoized).
 * createClient narrows its type from the `db.schema` option to a schema name
 * that isn't in the (untyped) Database generic, so we erase the generics
 * back to the default SupabaseClient shape (same fix as
 * /api/academy/progress's `service()`); table/column names are plain
 * strings here, so nothing downstream needs the narrowed schema type. */
export function graphService(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "graph" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

/**
 * Verify the caller's Supabase access token and return their user id, or
 * null. We never trust a client-supplied user id, only the token, verified
 * by gotrue, decides identity (matches /api/academy/progress verifyUser).
 */
export async function verifyLearner(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  try {
    const verifier = createClient(SUPABASE_URL as string, ANON_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

interface NodeRow {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  branch: string;
  summary: string | null;
  labels: Record<string, { title?: string; summary?: string }> | null;
  provenance: Record<string, unknown> | null;
}
interface EdgeRow {
  from_id: string;
  to_id: string;
  kind: string;
  weight: number | null;
}
interface StateRow {
  node_id: string;
  stage: string;
  confidence: number | null;
  updated_at: string;
}

/** Every node + prerequisite/derivation/citation/canon edge in one branch (Phase 0: '02-physics'). */
export async function loadSubgraph(branch: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const svc = graphService();
  const { data: nodeRows, error: nodeErr } = await svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance")
    .eq("branch", branch);
  if (nodeErr) throw new Error(`loadSubgraph: node query failed: ${nodeErr.message}`);
  const nodes: GraphNode[] = ((nodeRows as NodeRow[]) || []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.kind as GraphNode["kind"],
    tier: r.tier,
    branch: r.branch,
    summary: r.summary,
    labels: r.labels ?? undefined,
    provenance: r.provenance ?? undefined,
  }));

  const ids = nodes.map((n) => n.id);
  if (ids.length === 0) return { nodes, edges: [] };

  const { data: edgeRows, error: edgeErr } = await svc
    .from("edges")
    .select("from_id,to_id,kind,weight")
    .in("from_id", ids);
  if (edgeErr) throw new Error(`loadSubgraph: edge query failed: ${edgeErr.message}`);
  const edges: GraphEdge[] = ((edgeRows as EdgeRow[]) || []).map((r) => ({
    fromId: r.from_id,
    toId: r.to_id,
    kind: r.kind as GraphEdge["kind"],
    weight: r.weight,
  }));

  return { nodes, edges };
}

export async function loadLearnerStates(learnerId: string, nodeIds: string[]): Promise<LearnerNodeState[]> {
  if (nodeIds.length === 0) return [];
  const svc = graphService();
  const { data, error } = await svc
    .from("learner_node_state")
    .select("node_id,stage,confidence,updated_at")
    .eq("learner_id", learnerId)
    .in("node_id", nodeIds);
  if (error) throw new Error(`loadLearnerStates: query failed: ${error.message}`);
  return ((data as StateRow[]) || []).map((r) => ({
    nodeId: r.node_id,
    stage: r.stage as LearnerNodeState["stage"],
    confidence: r.confidence,
    updatedAt: r.updated_at,
  }));
}

export async function findNodeBySlug(slug: string): Promise<GraphNode | null> {
  const svc = graphService();
  const { data, error } = await svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as NodeRow;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.kind as GraphNode["kind"],
    tier: r.tier,
    branch: r.branch,
    summary: r.summary,
    labels: r.labels ?? undefined,
    provenance: r.provenance ?? undefined,
  };
}

export async function findNodeById(id: string): Promise<GraphNode | null> {
  const svc = graphService();
  const { data, error } = await svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as NodeRow;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.kind as GraphNode["kind"],
    tier: r.tier,
    branch: r.branch,
    summary: r.summary,
    labels: r.labels ?? undefined,
    provenance: r.provenance ?? undefined,
  };
}

/** Append one evidence event and, if `nextStage` differs, raise `stage`. Upserts the row if absent. */
export async function recordEvidence(
  learnerId: string,
  nodeId: string,
  nextStage: string,
  event: Record<string, unknown>,
): Promise<void> {
  const svc = graphService();
  const { data: existing } = await svc
    .from("learner_node_state")
    .select("stage,evidence")
    .eq("learner_id", learnerId)
    .eq("node_id", nodeId)
    .maybeSingle();

  const priorEvidence = (existing?.evidence as unknown[] | null) ?? [];
  const evidence = [...priorEvidence, event];
  const stage = nextStage || existing?.stage || "access";

  const { error } = await svc
    .from("learner_node_state")
    .upsert(
      { learner_id: learnerId, node_id: nodeId, stage, evidence, updated_at: new Date().toISOString() },
      { onConflict: "learner_id,node_id" },
    );
  if (error) throw new Error(`recordEvidence: upsert failed: ${error.message}`);
}
