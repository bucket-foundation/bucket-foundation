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
import type { GraphNode, GraphEdge, LearnerNodeState, EdgeKind, Stage } from "./types";
import type { EngineNodeDraft, GapNodeDraft, ProductionOutboxRow, GraphProductionRow } from "./engine-bridge";
import { buildProductionOutboxRow } from "./engine-bridge";
import type { PrereqAncestorRow } from "./closure";

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

export interface VerifiedIdentity {
  id: string;
  email: string | null;
}

/**
 * Verify the caller's Supabase access token and return their id + email, or
 * null. We never trust a client-supplied user id, only the token, verified
 * by gotrue, decides identity (matches /api/academy/progress verifyUser).
 * Shared by verifyLearner below and reviewer.ts's verifyReviewer, which
 * additionally checks the email against its allowlist.
 */
async function verifyToken(req: NextRequest): Promise<VerifiedIdentity | null> {
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
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** Verify the caller's token and return their user id, or null. */
export async function verifyLearner(req: NextRequest): Promise<string | null> {
  const identity = await verifyToken(req);
  return identity?.id ?? null;
}

/** Verify the caller's token and return their full identity (id + email), or null. */
export async function verifyLearnerIdentity(req: NextRequest): Promise<VerifiedIdentity | null> {
  return verifyToken(req);
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
  worked_example: { text?: unknown; source?: unknown } | null;
}

/** graph.nodes.worked_example -> GraphNode.workedExample (bkt-ros ros-14).
 * A malformed or partial row (missing `text` or `source`) is treated as
 * absent rather than surfaced half-built: every reader of `workedExample`
 * downstream (the workspace UI, grounding.ts's guidance pointer) can
 * assume a present value is always both fields, never one alone. */
function toWorkedExample(raw: NodeRow["worked_example"]): { text: string; source: string } | undefined {
  if (!raw || typeof raw.text !== "string" || typeof raw.source !== "string" || !raw.text.trim() || !raw.source.trim()) return undefined;
  return { text: raw.text, source: raw.source };
}
interface EdgeRow {
  id: string;
  from_id: string;
  to_id: string;
  kind: string;
  weight: number | null;
  confidence: number | null;
  confidence_source: string | null;
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
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example")
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
    workedExample: toWorkedExample(r.worked_example),
  }));

  const ids = nodes.map((n) => n.id);
  if (ids.length === 0) return { nodes, edges: [] };

  const { data: edgeRows, error: edgeErr } = await svc
    .from("edges")
    .select("id,from_id,to_id,kind,weight,confidence,confidence_source")
    .in("from_id", ids);
  if (edgeErr) throw new Error(`loadSubgraph: edge query failed: ${edgeErr.message}`);
  const edges: GraphEdge[] = ((edgeRows as EdgeRow[]) || []).map((r) => ({
    id: r.id,
    fromId: r.from_id,
    toId: r.to_id,
    kind: r.kind as GraphEdge["kind"],
    weight: r.weight,
    confidence: r.confidence,
    confidenceSource: r.confidence_source,
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

/**
 * The learner's current stage on one node, or "access" when no row exists
 * yet (the same "no record as access" default every route already applies
 * inline; centralized here, bkt-ros ros-04, so a transition that needs
 * `fromStage` -- production/route.ts's onProductionSubmitted call -- reads
 * it the same way state/route.ts and workspace/route.ts already do).
 */
export async function loadCurrentStage(learnerId: string, nodeId: string): Promise<Stage> {
  const svc = graphService();
  const { data } = await svc.from("learner_node_state").select("stage").eq("learner_id", learnerId).eq("node_id", nodeId).maybeSingle();
  return ((data?.stage as Stage | undefined) ?? "access") as Stage;
}

/**
 * Same query as loadLearnerStates, batched over every learner in one class
 * grid load (bkt-ros, ros-06 item 2) instead of one round trip per
 * learner. Grouped by learner id; a learner with no rows at all gets no
 * map entry (src/lib/research-os/class-view.ts's own functions already
 * treat "no entry" the same as "no record" for a given node).
 */
export async function loadLearnerStatesForMany(learnerIds: string[], nodeIds: string[]): Promise<Map<string, LearnerNodeState[]>> {
  const out = new Map<string, LearnerNodeState[]>();
  if (learnerIds.length === 0 || nodeIds.length === 0) return out;
  const svc = graphService();
  const { data, error } = await svc
    .from("learner_node_state")
    .select("learner_id,node_id,stage,confidence,updated_at")
    .in("learner_id", learnerIds)
    .in("node_id", nodeIds);
  if (error) throw new Error(`loadLearnerStatesForMany: query failed: ${error.message}`);
  for (const r of (data as (StateRow & { learner_id: string })[]) || []) {
    const state: LearnerNodeState = { nodeId: r.node_id, stage: r.stage as LearnerNodeState["stage"], confidence: r.confidence, updatedAt: r.updated_at };
    if (!out.has(r.learner_id)) out.set(r.learner_id, []);
    out.get(r.learner_id)!.push(state);
  }
  return out;
}

export interface ClassRow {
  id: string;
  name: string;
  reviewerEmail: string;
  createdAt: string;
}

/**
 * Every graph.classes row a reviewer owns (bkt-ros, ros-06 item 2), scoped
 * server-side to the verified reviewer identity (never a client-supplied
 * value) -- the "server check" half of "RLS plus server check" the class
 * route's own header names, matching the ownership check
 * /api/research-os/production's POST already performs against
 * `learner_id` the same way. Case-insensitive against reviewer_email,
 * matching reviewer.ts's own allowlist comparison. Filtered in application
 * code rather than a SQL `ILIKE`: a verified email can contain `_` or `%`,
 * both ILIKE wildcards, so building a pattern from it risks matching more
 * than the exact address. graph.classes is a small, Phase-1-scale table
 * (a handful of rows per reviewer), so reading all rows and filtering in
 * JS costs nothing today and stays correct regardless of what characters
 * an email contains.
 */
interface RawClassRow {
  id: string;
  name: string;
  reviewer_email: string;
  created_at: string;
}

/**
 * The scoping decision alone, no I/O -- split out from loadClassesForReviewer
 * so the "a reviewer for class A never sees class B" guarantee is
 * unit-testable with no network call (scripts/test-research-os-teacher-class.ts,
 * "class scoping"), the same reason isReviewerEmail was split out of
 * verifyReviewer. Case-insensitive, matching reviewer.ts's own allowlist
 * comparison.
 */
export function filterClassesForReviewer(rows: RawClassRow[], reviewerEmail: string): ClassRow[] {
  const wanted = reviewerEmail.trim().toLowerCase();
  return rows
    .filter((r) => r.reviewer_email.trim().toLowerCase() === wanted)
    .map((r) => ({ id: r.id, name: r.name, reviewerEmail: r.reviewer_email, createdAt: r.created_at }));
}

export async function loadClassesForReviewer(reviewerEmail: string): Promise<ClassRow[]> {
  const svc = graphService();
  const { data, error } = await svc.from("classes").select("id,name,reviewer_email,created_at");
  if (error) throw new Error(`loadClassesForReviewer: query failed: ${error.message}`);
  return filterClassesForReviewer((data as RawClassRow[]) || [], reviewerEmail);
}

/** Every graph.class_members row for the given classes, as classId -> learnerIds. */
export async function loadClassMembers(classIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (classIds.length === 0) return out;
  const svc = graphService();
  const { data, error } = await svc.from("class_members").select("class_id,learner_id").in("class_id", classIds);
  if (error) throw new Error(`loadClassMembers: query failed: ${error.message}`);
  for (const r of (data as { class_id: string; learner_id: string }[]) || []) {
    if (!out.has(r.class_id)) out.set(r.class_id, []);
    out.get(r.class_id)!.push(r.learner_id);
  }
  return out;
}

interface AncestorRow {
  node_id: string;
  ancestor_id: string;
  min_hops: number;
  min_confidence: number;
}

/**
 * Every graph.prereq_ancestor row for `targetId` (bkt-ros, Phase 1 item 1).
 * Fails open to an empty array on any read error (missing table on a
 * fresh environment that has not run scripts/rebuild-prereq-ancestor.ts
 * yet, a network blip, etc.) instead of throwing, matching the
 * migration's documented fallback: an empty result makes
 * frontier.ts's computeFrontier fall back to its original full-graph walk.
 */
export async function loadAncestorRows(targetId: string): Promise<PrereqAncestorRow[]> {
  const svc = graphService();
  try {
    const { data, error } = await svc
      .from("prereq_ancestor")
      .select("node_id,ancestor_id,min_hops,min_confidence")
      .eq("node_id", targetId);
    if (error) return [];
    return ((data as AncestorRow[]) || []).map((r) => ({
      nodeId: r.node_id,
      ancestorId: r.ancestor_id,
      minHops: r.min_hops,
      minConfidence: r.min_confidence,
    }));
  } catch {
    return [];
  }
}

/**
 * Upsert a low-confidence-edge flag for one (edge, learner) pair (bkt-ros
 * ros-03 item 3: "low-confidence edges on a returned chain are written to a
 * graph.edge_flags table ... so ros-06's class view can surface them").
 * `onConflict: "edge_id,learner_id"` plus `ignoreDuplicates` makes a repeat
 * route call for the same learner over the same weak edge a no-op rather
 * than a growing row-per-request log: `created_at` records when the flag
 * was FIRST raised. Flags with no `edgeId` (a fixture edge, never a live
 * database row) are silently skipped rather than erroring: there is
 * nothing in graph.edges for them to reference.
 */
export async function writeEdgeFlags(
  learnerId: string,
  targetNodeId: string,
  flags: { edgeId?: string }[],
): Promise<void> {
  const rows = flags
    .filter((f): f is { edgeId: string } => Boolean(f.edgeId))
    .map((f) => ({ edge_id: f.edgeId, learner_id: learnerId, target_node_id: targetNodeId }));
  if (rows.length === 0) return;
  const svc = graphService();
  const { error } = await svc.from("edge_flags").upsert(rows, { onConflict: "edge_id,learner_id", ignoreDuplicates: true });
  if (error) throw new Error(`writeEdgeFlags: upsert failed: ${error.message}`);
}

export async function findNodeBySlug(slug: string): Promise<GraphNode | null> {
  const svc = graphService();
  const { data, error } = await svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example")
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
    workedExample: toWorkedExample(r.worked_example),
  };
}

export async function findNodeById(id: string): Promise<GraphNode | null> {
  const svc = graphService();
  const { data, error } = await svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example")
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
    workedExample: toWorkedExample(r.worked_example),
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
// Faded guidance (bkt-ros ros-14). See src/lib/research-os/guidance.ts for
// the pure rules these two reads feed; both fail open (empty/false) rather
// than throwing, so a guidance-level read never fails the request it backs.
// ---------------------------------------------------------------------------

export interface RecentCheckEvent {
  at: string;
  nodeId: string;
  result: "support" | "contradiction" | "unknown";
  confidence: "high" | "medium" | "low";
  abstained: boolean;
}

/**
 * Every "check" evidence event across every node this learner has any
 * state row for, diagnostic-probe checks excluded (their own evidence
 * carries `note: "diagnostic_probe"`; probe.ts's header already
 * establishes a cold-start probe answer measures something different from
 * an in-path Check, so it should not feed the in-path fading schedule),
 * sorted newest first, capped at `limit`.
 *
 * Phase 0 scale (a handful of learner_node_state rows per learner): reads
 * every row for this learner and filters/sorts in JS rather than a
 * per-event SQL query against a jsonb array column, matching this file's
 * own loadClassesForReviewer precedent for a Phase-1-scale table. A read
 * error (missing table, network blip) fails open to an empty array, the
 * same posture loadAncestorRows already documents: guidance.ts's
 * nextGuidanceLevel treats "fewer than two outcomes" as "leave the base
 * level unchanged," so an empty result here degrades to no adjustment
 * rather than a failed request.
 */
export async function loadRecentCheckEvents(learnerId: string, limit: number): Promise<RecentCheckEvent[]> {
  const svc = graphService();
  try {
    const { data, error } = await svc.from("learner_node_state").select("node_id,evidence").eq("learner_id", learnerId);
    if (error) return [];
    const events: RecentCheckEvent[] = [];
    for (const row of (data as { node_id: string; evidence: Array<Record<string, unknown>> | null }[]) || []) {
      for (const ev of row.evidence || []) {
        if (ev.kind !== "check" || ev.note === "diagnostic_probe") continue;
        if (typeof ev.at !== "string" || typeof ev.result !== "string" || typeof ev.confidence !== "string") continue;
        events.push({
          at: ev.at,
          nodeId: row.node_id,
          result: ev.result as RecentCheckEvent["result"],
          confidence: ev.confidence as RecentCheckEvent["confidence"],
          abstained: Boolean(ev.abstained),
        });
      }
    }
    events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return events.slice(0, limit);
  } catch {
    return [];
  }
}

interface ClassGuidanceRow {
  id: string;
  research_os_guidance_enabled: boolean | null;
}

/**
 * The class-switch OR rule alone, pure and dependency-free so it is
 * unit-testable with plain fixture rows (scripts/test-research-os-guidance.ts,
 * matching this file's own filterClassesForReviewer precedent for
 * splitting a scoping/combination decision out of its DB-reading wrapper):
 * true unless `rows` is non-empty AND every row's switch reads false.
 * `null` (a class row from before this column existed on a fresh
 * environment mid-migration) is treated as "on," the column's own SQL
 * default. An empty `rows` array -- no membership, or every membership
 * dangling -- reads as enabled, the base product behavior for a learner
 * outside any pilot class.
 */
export function decideGuidanceEnabled(rows: ClassGuidanceRow[]): boolean {
  if (rows.length === 0) return true;
  return rows.some((r) => r.research_os_guidance_enabled !== false);
}

/**
 * The per-class `research_os_guidance_enabled` arm switch (bkt-ros ros-14
 * item 4, mirroring PR #63's cognitive-forcing switch): the DB-reading
 * wrapper around decideGuidanceEnabled above. A learner enrolled in more
 * than one class is enabled if ANY of them has the switch on, since a
 * pilot's own control-arm assignment is a property of a specific class
 * roster: one shared class should never be able to silently veto
 * guidance for every other class this learner is also in. Fails open to `true` on
 * a read error, matching every other best-effort read in this file: a
 * broken class join should never silently strip a learner's own
 * scaffolding.
 */
export async function isGuidanceEnabledForLearner(learnerId: string): Promise<boolean> {
  const svc = graphService();
  try {
    const { data: memberRows, error: memberErr } = await svc.from("class_members").select("class_id").eq("learner_id", learnerId);
    if (memberErr) return true;
    const classIds = ((memberRows as { class_id: string }[]) || []).map((r) => r.class_id);
    if (classIds.length === 0) return true;

    const { data: classRows, error: classErr } = await svc.from("classes").select("id,research_os_guidance_enabled").in("id", classIds);
    if (classErr) return true;
    return decideGuidanceEnabled((classRows as ClassGuidanceRow[]) || []);
  } catch {
    return true;
  }
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
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example")
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
    workedExample: toWorkedExample(r.worked_example),
  };
}

/**
 * A campaign's own gap node (ros-12 item 4, `engine-bridge.ts`'s
 * `buildGapNode`) as a `graph.nodes` row. Same upsert shape as
 * `upsertEngineHypothesisNode` above (kept as its own function rather than
 * a shared generic one, so a future change to either write path never
 * risks the other): idempotent on `slug`, `engine-bridge.ts`'s
 * `gapNodeSlug` is deterministic on `(engine, runId, gapId)`.
 */
export async function upsertGapNode(draft: GapNodeDraft): Promise<GraphNode> {
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
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example")
    .single();
  if (error) throw new Error(`upsertGapNode: upsert failed: ${error.message}`);
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
    workedExample: toWorkedExample(r.worked_example),
  };
}

/** Every `graph.nodes.id` for a given list of slugs, as a slug -> id map. A
 * slug absent from the graph is absent from the returned map. */
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
 * Write an accepted production's row to `public.research_os_
 * productions_outbox` (task item 3). Idempotent on `id`'s own primary key
 * (the bridge's own migration, `graph.productions.id` reused verbatim):
 * re-emitting the same production updates its one outbox row instead of
 * inserting a second one.
 */
export async function writeProductionOutbox(row: ProductionOutboxRow): Promise<void> {
  const svc = publicService();
  const { error } = await svc.from("research_os_productions_outbox").upsert(
    {
      id: row.id,
      target_node_id: row.target_node_id,
      claim: row.claim,
      evidence: row.evidence,
      sources: row.sources,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      _target_node: row._target_node,
      emitted_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`writeProductionOutbox: upsert failed: ${error.message}`);
}

/**
 * Best-effort: given a `graph.productions` row that was just written with
 * `status: "accepted"`, resolve its target node and emit the outbox row
 * (task item 3, buildProductionOutboxRow + writeProductionOutbox above --
 * neither is reimplemented here, only composed). No-op for any other
 * status. Shared by /api/research-os/production's own POST (a
 * learner-context write; unreachable today, that route still rejects a
 * client-supplied "accepted") and /api/research-os/review's POST (bkt-ros,
 * ros-06's teacher-accept path, the first caller that reaches "accepted"
 * on a real, live write), so both entry points emit through the exact same function
 * rather than two copies of the same three calls. A failed emit never
 * fails the caller's own write, matching academy's own mirror-job
 * best-effort posture (the original inline comment this was extracted
 * from, preserved in _intake/research-os-k12/DELETIONS.md).
 */
export async function emitProductionOutboxIfAccepted(production: GraphProductionRow): Promise<void> {
  if (production.status !== "accepted") return;
  try {
    const targetNode = await findNodeById(production.target_node_id);
    const row = buildProductionOutboxRow(
      production,
      targetNode ? { slug: targetNode.slug, title: targetNode.title, tier: targetNode.tier, branch: targetNode.branch } : null,
    );
    await writeProductionOutbox(row);
  } catch {
    // best effort, see comment above
  }
}
