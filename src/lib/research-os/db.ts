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
import type { GraphNode, GraphEdge, LearnerNodeState, EdgeKind } from "./types";
import type { EngineNodeDraft, ProductionOutboxEnvelope } from "./engine-bridge";

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

let _pub: SupabaseClient | null = null;
/**
 * Service-role client bound to the default `public` schema (memoized),
 * distinct from `graphService()`'s private `graph` schema. Engine bridge
 * task item 3's `research_os_productions_outbox` table lives in `public` on
 * purpose: `hte.corpus.production.load_supabase` reads a Supabase table over
 * plain PostgREST with no `Accept-Profile` header, so only the schema
 * PostgREST serves by default is reachable from the engine's own Python
 * loader without a code change there. See learning/research-os/ENGINE-
 * BRIDGE.md, "Why the outbox lives in `public`."
 */
export function publicService(): SupabaseClient {
  if (_pub) return _pub;
  _pub = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _pub;
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

// ---------------------------------------------------------------------------
// Engine bridge (bkt-ros, engine bridge task). See src/lib/research-os/
// engine-bridge.ts for the pure envelope-mapping functions these write.
// ---------------------------------------------------------------------------

/**
 * Upsert an accepted engine hypothesis as a `graph.nodes` row (task item 1).
 * Idempotent on `graph.nodes.slug`'s own unique constraint: `draft.slug` is
 * deterministic on `(engine, runId, hypothesisId)` (`engine-bridge.ts`'s
 * `engineNodeSlug`), so a repeat call with the same three values updates the
 * same row's `id` rather than inserting a duplicate.
 */
export async function upsertEngineHypothesisNode(draft: EngineNodeDraft): Promise<GraphNode> {
  const svc = graphService();
  const { data, error } = await svc
    .from("nodes")
    .upsert(
      {
        slug: draft.slug,
        title: draft.title,
        kind: draft.kind,
        tier: draft.tier,
        branch: draft.branch,
        summary: draft.summary,
        provenance: draft.provenance,
      },
      { onConflict: "slug" },
    )
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance")
    .single();
  if (error) throw new Error(`upsertEngineHypothesisNode: upsert failed: ${error.message}`);
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

/** Every `graph.nodes.id` for a given list of slugs, as a slug -> id map. A
 * slug absent from the graph is simply absent from the returned map. */
export async function resolveNodeIdsBySlug(slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  if (unique.length === 0) return out;
  const svc = graphService();
  const { data, error } = await svc.from("nodes").select("id,slug").in("slug", unique);
  if (error) throw new Error(`resolveNodeIdsBySlug: query failed: ${error.message}`);
  for (const r of (data as { id: string; slug: string }[]) || []) out.set(r.slug, r.id);
  return out;
}

/**
 * Write every edge an engine hypothesis node wants (task item 1's `cites`
 * and `derives_from` edges), resolving each target slug to a live node id
 * first. A target slug that resolves to nothing is skipped rather than
 * raised, `graph.edges`'s foreign key requires both ends to exist, and the
 * raw ref already lives losslessly on the node's own `provenance.
 * evidence_refs` (`engine-bridge.ts`'s `buildEngineNode`), so nothing is
 * lost, the edge is only deferred until that node exists. Idempotent: the
 * bridge's own migration adds a `(from_id,to_id,kind)` unique constraint to
 * `graph.edges`, so `ignoreDuplicates` makes a repeat write a no-op rather
 * than a duplicate row.
 */
export async function writeEngineEdges(
  fromId: string,
  edges: { toSlug: string; kind: EdgeKind }[],
): Promise<{ written: number; skipped: string[] }> {
  if (edges.length === 0) return { written: 0, skipped: [] };
  const idBySlug = await resolveNodeIdsBySlug(edges.map((e) => e.toSlug));
  const rows: { from_id: string; to_id: string; kind: string }[] = [];
  const skipped: string[] = [];
  for (const e of edges) {
    const toId = idBySlug.get(e.toSlug);
    if (!toId || toId === fromId) {
      skipped.push(e.toSlug);
      continue;
    }
    rows.push({ from_id: fromId, to_id: toId, kind: e.kind });
  }
  if (rows.length === 0) return { written: 0, skipped };
  const svc = graphService();
  const { error } = await svc.from("edges").upsert(rows, { onConflict: "from_id,to_id,kind", ignoreDuplicates: true });
  if (error) throw new Error(`writeEngineEdges: upsert failed: ${error.message}`);
  return { written: rows.length, skipped };
}

/**
 * Write an accepted production's envelope to `public.research_os_
 * productions_outbox` (task item 3). Idempotent on `graph_production_id`'s
 * own unique constraint: re-emitting the same production updates its one
 * outbox row instead of inserting a second one.
 */
export async function writeProductionOutbox(envelope: ProductionOutboxEnvelope, graphProductionId: string): Promise<void> {
  const svc = publicService();
  const { error } = await svc.from("research_os_productions_outbox").upsert(
    {
      id: envelope.id,
      graph_production_id: graphProductionId,
      created_at: envelope.created_at,
      author_role: envelope.author_role,
      grade_band: envelope.grade_band,
      school_or_district_id: envelope.school_or_district_id,
      research_question: envelope.research_question,
      claims: envelope.claims,
      review: envelope.review,
      provenance: envelope.provenance,
      emitted_at: new Date().toISOString(),
    },
    { onConflict: "graph_production_id" },
  );
  if (error) throw new Error(`writeProductionOutbox: upsert failed: ${error.message}`);
}
