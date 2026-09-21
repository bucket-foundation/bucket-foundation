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
import { verifyRequestUser } from "../auth/verify";
import type { GraphNode, GraphEdge, LearnerNodeState, EdgeKind, Stage } from "./types";
import type { EngineNodeDraft, GapNodeDraft, ProductionOutboxRow, GraphProductionRow } from "./engine-bridge";
import { buildProductionOutboxRow } from "./engine-bridge";
import type { PrereqAncestorRow } from "./closure";
import { applyTransition, type Badge, type GameState } from "./game";

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
 * Verify the caller (Bearer token or the site cookie session, see
 * src/lib/auth/verify.ts) and return their id + email, or null. Shared by
 * verifyLearner below and reviewer.ts's verifyReviewer, which additionally
 * checks the email against its allowlist.
 */
async function verifyToken(req: NextRequest): Promise<VerifiedIdentity | null> {
  return verifyRequestUser(req);
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
  visibility?: string | null;
  owner_id?: string | null;
  frontier_flag?: string | null;
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
export interface EdgeRow {
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
/**
 * Two different limits bite on a read filtered by a list of ids.
 *
 * PostgREST filters travel in the URL, and a long `in (...)` list fails
 * with "URI too long", so the ids are chunked at IN_CHUNK. PostgREST also
 * stops at PAGE rows per request, which the chunking says nothing about:
 * 60 node ids on a dense branch overflow a thousand edges without an
 * error, and the caller reads the truncation as the whole answer. The
 * page loop closes that (Bucket critic C42).
 *
 * The callback takes the page and must apply both `.range(page.from,
 * page.to)` and an `.order()`. Postgres gives no stable row order across
 * LIMIT/OFFSET without one, so an unordered page can repeat a row and
 * skip another.
 */
export const IN_CHUNK = 60;
export const PAGE = 1000;
/**
 * A callback that forgets `.range()` answers the same full page forever,
 * so the loop would spin rather than truncate. This turns that mistake
 * into a loud failure at 200,000 rows.
 */
export const MAX_PAGES = 200;

export class PagingError extends Error {
  constructor(what: string) {
    super(`${what}: a paged read did not terminate after ${MAX_PAGES} pages. The callback must apply .range(page.from, page.to).`);
    this.name = "PagingError";
    // Downlevelled `extends Error` loses the prototype chain, so
    // `instanceof PagingError` answers false without this.
    Object.setPrototypeOf(this, PagingError.prototype);
  }
}

export interface ChunkPage {
  from: number;
  to: number;
}

/**
 * One read, paged. For a query with no id list to chunk: the row cap
 * still applies, so a learner past a thousand rows loses the remainder
 * with no error (Bucket critic C45). The callback applies
 * `.range(page.from, page.to)` and an `.order()`.
 */
export async function pagedRead<T>(
  run: (page: ChunkPage) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; ; p += 1) {
    if (p >= MAX_PAGES) throw new PagingError("pagedRead");
    const { data, error } = await run({ from: p * PAGE, to: p * PAGE + PAGE - 1 });
    if (error) throw new Error(error.message);
    const page = data || [];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

export async function inChunks<T>(
  ids: string[],
  run: (chunk: string[], page: ChunkPage) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    for (let p = 0; ; p += 1) {
      if (p >= MAX_PAGES) throw new PagingError("inChunks");
      const { data, error } = await run(chunk, { from: p * PAGE, to: p * PAGE + PAGE - 1 });
      if (error) throw new Error(error.message);
      const page = data || [];
      out.push(...page);
      if (page.length < PAGE) break;
    }
  }
  return out;
}

/**
 * A branch's nodes and the edges leaving them. With `externalFactors`, also
 * what the branch rests on in other branches (learning/research-os/
 * PRIMES.md): every prereq_ancestor ancestor outside the branch, every
 * derives_from factor outside it, the prerequisite edges coming in, and the
 * edges among those nodes, so a node page shows a cross-branch factor and
 * routing can walk into another branch.
 */
export async function loadSubgraph(branch: string, opts: { externalFactors?: boolean } = {}): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const svc = graphService();
  // PostgREST pages at 1,000 rows; a branch can hold more.
  const nodeRows: NodeRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: nodeErr } = await svc
      .from("nodes")
      .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example,visibility,owner_id,frontier_flag")
      .eq("branch", branch)
      .order("slug")
      .range(from, from + 999);
    if (nodeErr) throw new Error(`loadSubgraph: node query failed: ${nodeErr.message}`);
    const page = (data as NodeRow[]) || [];
    nodeRows.push(...page);
    if (page.length < 1000) break;
  }
  const nodes: GraphNode[] = nodeRows.map((r) => ({
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
    visibility: (r.visibility as GraphNode["visibility"]) ?? "public",
    ownerId: r.owner_id ?? null,
    frontierFlag: (r.frontier_flag as GraphNode["frontierFlag"]) ?? null,
  }));

  const ids = nodes.map((n) => n.id);
  if (ids.length === 0) return { nodes, edges: [] };

  let edgeRows: EdgeRow[];
  try {
    edgeRows = await inChunks<EdgeRow>(ids, (chunk, page) => svc.from("edges").select("id,from_id,to_id,kind,weight,confidence,confidence_source").in("from_id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: EdgeRow[] | null; error: { message: string } | null }>);
  } catch (err) {
    throw new Error(`loadSubgraph: edge query failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (opts.externalFactors) {
    try {
      await addExternalFactors(svc, ids, nodes, (edgeRows ||= []));
    } catch (err) {
      throw new Error(`loadSubgraph: external factor query failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const edges: GraphEdge[] = (edgeRows || []).map((r) => ({
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

const NODE_COLUMNS = "id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example,visibility,owner_id,frontier_flag";
const EDGE_COLUMNS = "id,from_id,to_id,kind,weight,confidence,confidence_source";

/** Mutates `nodes` and `edgeRows`: adds the branch's factors from other branches and the edges among them. */
export async function addExternalFactors(svc: SupabaseClient, branchIds: string[], nodes: GraphNode[], edgeRows: EdgeRow[]): Promise<void> {
  const inBranch = new Set(branchIds);
  const external = new Set<string>();
  const ancestors = await inChunks<{ ancestor_id: string }>(branchIds, (chunk, page) =>
    svc.from("prereq_ancestor").select("ancestor_id").in("node_id", chunk).order("node_id").order("ancestor_id").range(page.from, page.to) as unknown as Promise<{ data: { ancestor_id: string }[] | null; error: { message: string } | null }>,
  );
  for (const a of ancestors) if (!inBranch.has(a.ancestor_id)) external.add(a.ancestor_id);
  const incoming = await inChunks<EdgeRow>(branchIds, (chunk, page) =>
    svc.from("edges").select(EDGE_COLUMNS).in("to_id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: EdgeRow[] | null; error: { message: string } | null }>,
  );
  for (const e of incoming) if (!inBranch.has(e.from_id) && e.kind === "prerequisite") external.add(e.from_id);
  for (const e of edgeRows) if (e.kind === "derives_from" && !inBranch.has(e.to_id)) external.add(e.to_id);
  if (!external.size) return;
  const ext = Array.from(external);
  const extRows = await inChunks<NodeRow>(ext, (chunk, page) =>
    svc.from("nodes").select(NODE_COLUMNS).in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: NodeRow[] | null; error: { message: string } | null }>,
  );
  for (const r of extRows)
    nodes.push({
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
      visibility: (r.visibility as GraphNode["visibility"]) ?? "public",
      ownerId: r.owner_id ?? null,
      frontierFlag: (r.frontier_flag as GraphNode["frontierFlag"]) ?? null,
    });
  const all = new Set(branchIds.concat(extRows.map((r) => r.id)));
  const fromExternal = await inChunks<EdgeRow>(
    extRows.map((r) => r.id),
    (chunk, page) => svc.from("edges").select(EDGE_COLUMNS).in("from_id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: EdgeRow[] | null; error: { message: string } | null }>,
  );
  const seen = new Set(edgeRows.map((e) => e.id));
  for (const e of incoming.concat(fromExternal)) {
    if (seen.has(e.id) || !all.has(e.from_id) || !all.has(e.to_id)) continue;
    seen.add(e.id);
    edgeRows.push(e);
  }
}

export async function loadLearnerStates(learnerId: string, nodeIds: string[]): Promise<LearnerNodeState[]> {
  if (nodeIds.length === 0) return [];
  const svc = graphService();
  let data: StateRow[];
  try {
    data = await inChunks<StateRow>(nodeIds, (chunk, page) => svc.from("learner_node_state").select("node_id,stage,confidence,updated_at").eq("learner_id", learnerId).in("node_id", chunk).order("node_id").range(page.from, page.to) as unknown as Promise<{ data: StateRow[] | null; error: { message: string } | null }>);
  } catch (err) {
    throw new Error(`loadLearnerStates: query failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return (data || []).map((r) => ({
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
  let data: (StateRow & { learner_id: string })[];
  try {
    // Both lists are chunked. Taking the first IN_CHUNK learners dropped
    // everyone past sixty out of the teacher grid with no total to
    // compare against, which is the defect fixed one file over in
    // /graph's heatmap and left here (Bucket critic C72).
    data = [];
    for (let i = 0; i < learnerIds.length; i += IN_CHUNK) {
      const learners = learnerIds.slice(i, i + IN_CHUNK);
      data.push(
        ...(await inChunks<StateRow & { learner_id: string }>(nodeIds, (chunk, page) => svc.from("learner_node_state").select("learner_id,node_id,stage,confidence,updated_at").in("learner_id", learners).in("node_id", chunk).order("learner_id").order("node_id").range(page.from, page.to) as unknown as Promise<{ data: (StateRow & { learner_id: string })[] | null; error: { message: string } | null }>)),
      );
    }
  } catch (err) {
    throw new Error(`loadLearnerStatesForMany: query failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  for (const r of data || []) {
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

/**
 * Every "quote"-kind evidence entry across every node this learner holds a
 * state row for (bkt-ros, production guard bead, task item 1). One
 * learner_node_state row per node, so this is one query over the
 * learner's whole graph rather than a per-node fetch; a Phase 0-scale
 * learner holds at most a few dozen rows. src/lib/research-os/
 * production-guard.ts's checkSourceProvenance is the pure function that
 * reads this list; this function only assembles it.
 */
export interface QuoteEvidenceRecord {
  nodeId: string;
  locator: string;
  at: string;
}

export async function loadLearnerQuoteEvidence(learnerId: string): Promise<QuoteEvidenceRecord[]> {
  const svc = graphService();
  const { data, error } = await svc.from("learner_node_state").select("node_id,evidence").eq("learner_id", learnerId);
  if (error) throw new Error(`loadLearnerQuoteEvidence: query failed: ${error.message}`);
  const out: QuoteEvidenceRecord[] = [];
  for (const row of (data as { node_id: string; evidence: Array<Record<string, unknown>> | null }[]) || []) {
    for (const ev of row.evidence || []) {
      if (ev?.kind === "quote" && typeof ev.locator === "string" && ev.locator.trim()) {
        out.push({ nodeId: row.node_id, locator: ev.locator, at: (ev.at as string | undefined) ?? "" });
      }
    }
  }
  return out;
}

export interface ClaimCandidateRow {
  id: string;
  claim: string;
}

/**
 * This learner's own prior Production claims, every status, excluding
 * `excludeId` (the production being submitted right now, on a resubmit)
 * -- production guard, task item 2's first duplicate-detection
 * population, "this learner's prior Productions." A row with a blank or
 * null claim is dropped: there is nothing to compare tokens against.
 */
export async function loadOwnPriorClaims(learnerId: string, excludeId?: string): Promise<ClaimCandidateRow[]> {
  const svc = graphService();
  let q = svc.from("productions").select("id,claim").eq("learner_id", learnerId);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`loadOwnPriorClaims: query failed: ${error.message}`);
  return ((data as { id: string; claim: string | null }[]) || [])
    .filter((r) => (r.claim || "").trim())
    .map((r) => ({ id: r.id, claim: r.claim as string }));
}

/**
 * Every OTHER learner's accepted Production claims, scoped to a class
 * this learner shares with them -- production guard, task item 2's
 * second duplicate-detection population, "other learners' accepted
 * Productions in the same class." Reuses `class_members` the same way
 * `loadClassMembers` above already does (own class ids, then every
 * member of those classes); a learner in no class at all gets an empty
 * list rather than a query error, matching this bead's "never blocks
 * submission" posture -- a missing roster is not a reason to skip
 * duplicate detection for the populations that ARE available.
 */
export async function loadClassPeerAcceptedClaims(learnerId: string): Promise<ClaimCandidateRow[]> {
  const svc = graphService();
  const { data: memberships, error: memErr } = await svc.from("class_members").select("class_id").eq("learner_id", learnerId);
  if (memErr) throw new Error(`loadClassPeerAcceptedClaims: membership query failed: ${memErr.message}`);
  const classIds = Array.from(new Set(((memberships as { class_id: string }[]) || []).map((m) => m.class_id)));
  if (classIds.length === 0) return [];

  const { data: peerRows, error: peerErr } = await svc.from("class_members").select("learner_id").in("class_id", classIds);
  if (peerErr) throw new Error(`loadClassPeerAcceptedClaims: peer query failed: ${peerErr.message}`);
  const peerIds = Array.from(new Set(((peerRows as { learner_id: string }[]) || []).map((r) => r.learner_id))).filter((id) => id !== learnerId);
  if (peerIds.length === 0) return [];

  const { data: prodRows, error: prodErr } = await svc.from("productions").select("id,claim").in("learner_id", peerIds).eq("status", "accepted");
  if (prodErr) throw new Error(`loadClassPeerAcceptedClaims: production query failed: ${prodErr.message}`);
  return ((prodRows as { id: string; claim: string | null }[]) || [])
    .filter((r) => (r.claim || "").trim())
    .map((r) => ({ id: r.id, claim: r.claim as string }));
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

/**
 * The per-class Check cognitive-forcing override (bkt-ros, PLAN-REVISION-2.md
 * section 2a; `graph.classes.forcing_enabled`, migration
 * 20260910060000_research_os_forcing.sql). Returns `null` on "no override
 * on file", which is also what a learner in no class, or any query
 * failure, returns: `src/lib/research-os/forcing.ts`'s
 * resolveForcingEnabled reads `null` as "defer to the
 * RESEARCH_OS_FORCING_ENABLED env default," the same fail-open posture
 * loadAncestorRows uses above, so this optional lookup can never break a
 * Check call, including in an environment where this migration has not
 * run yet. A learner in more than one class (not a shape the manual seed
 * or the roster sync produces today) reads the first class row with a
 * non-null override; Phase 1's pilot assigns one class per arm, so this is
 * documented rather than enforced.
 */
export async function loadForcingEnabledForLearner(learnerId: string): Promise<boolean | null> {
  try {
    const svc = graphService();
    const { data: memberRows, error: memberErr } = await svc.from("class_members").select("class_id").eq("learner_id", learnerId);
    if (memberErr || !memberRows || memberRows.length === 0) return null;
    const classIds = Array.from(new Set((memberRows as { class_id: string }[]).map((r) => r.class_id)));
    const { data: classRows, error: classErr } = await svc.from("classes").select("id,forcing_enabled").in("id", classIds);
    if (classErr || !classRows) return null;
    const withOverride = (classRows as { id: string; forcing_enabled: boolean | null }[]).find((c) => typeof c.forcing_enabled === "boolean");
    return withOverride ? withOverride.forcing_enabled : null;
  } catch {
    return null;
  }
}

/**
 * The per-class lateral-reading second-source override (bkt-ros,
 * PLAN-REVISION-3.md section 2c; `graph.classes.second_source_required`,
 * migration 20260910080001_research_os_lateral_reading.sql). Same shape
 * and same fail-open posture as loadForcingEnabledForLearner right above:
 * `null` on "no override on file", on a learner in no class, or on any
 * query failure, all three of which `src/lib/research-os/lateral-
 * reading.ts`'s resolveSecondSourceRequired reads as "defer to the
 * RESEARCH_OS_SECOND_SOURCE_REQUIRED env default," so this optional
 * lookup can never break a Check call, including in an environment where
 * this migration has not run yet.
 */
export async function loadSecondSourceRequiredForLearner(learnerId: string): Promise<boolean | null> {
  try {
    const svc = graphService();
    const { data: memberRows, error: memberErr } = await svc.from("class_members").select("class_id").eq("learner_id", learnerId);
    if (memberErr || !memberRows || memberRows.length === 0) return null;
    const classIds = Array.from(new Set((memberRows as { class_id: string }[]).map((r) => r.class_id)));
    const { data: classRows, error: classErr } = await svc.from("classes").select("id,second_source_required").in("id", classIds);
    if (classErr || !classRows) return null;
    const withOverride = (classRows as { id: string; second_source_required: boolean | null }[]).find((c) => typeof c.second_source_required === "boolean");
    return withOverride ? withOverride.second_source_required : null;
  } catch {
    return null;
  }
}

/**
 * Every "corroboration"-kind evidence entry across every node this
 * learner holds a state row for (bkt-ros, PLAN-REVISION-3.md section 2c;
 * production-guard.ts's lateralReadingFlag is the pure function that
 * reads this list, the same "assemble here, decide in production-
 * guard.ts" split loadLearnerQuoteEvidence right above already keeps for
 * "quote"-kind events). One learner_node_state row per node, so this is
 * one query over the learner's whole graph rather than a per-node fetch.
 */
export interface CorroborationEvidenceRecord {
  firstSourceId: string;
  secondSourceId: string;
  independenceReason: string;
  passagesAgree: boolean;
  at: string;
}

export async function loadLearnerCorroborationEvidence(learnerId: string): Promise<CorroborationEvidenceRecord[]> {
  const svc = graphService();
  const { data, error } = await svc.from("learner_node_state").select("evidence").eq("learner_id", learnerId);
  if (error) throw new Error(`loadLearnerCorroborationEvidence: query failed: ${error.message}`);
  const out: CorroborationEvidenceRecord[] = [];
  for (const row of (data as { evidence: Array<Record<string, unknown>> | null }[]) || []) {
    for (const ev of row.evidence || []) {
      if (ev?.kind === "corroboration" && typeof ev.firstSourceId === "string" && typeof ev.secondSourceId === "string") {
        out.push({
          firstSourceId: ev.firstSourceId,
          secondSourceId: ev.secondSourceId,
          independenceReason: typeof ev.independenceReason === "string" ? ev.independenceReason : "",
          passagesAgree: Boolean(ev.passagesAgree),
          at: (ev.at as string | undefined) ?? "",
        });
      }
    }
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
/** What the append left behind, for a caller that has to report durability. */
export interface EvidenceAppend {
  /** The stage the row held when the append locked it, null when this call created it. */
  priorStage: Stage | null;
  /** The stage the row holds now. */
  stage: Stage;
  /** True when this call created the learner's row for that node. */
  created: boolean;
  /**
   * The stage XP is awarded from, which is the highest stage already
   * credited for this node, or null on a first award. Equal to `stage` when
   * the node has been credited this high before, so nothing is awarded.
   */
  awardFrom: Stage | null;
  /** True when this append raised the node's high-water mark. */
  awards: boolean;
  /** How many events the log holds after this one. */
  eventCount: number;
}

/** Postgres codes worth one more attempt: lock timeout, serialization, deadlock. */
const RETRYABLE_SQLSTATES = new Set(["55P03", "40001", "40P01"]);

/** An append that failed, carrying the SQLSTATE so a caller can tell a wait from a refusal. */
export class EvidenceAppendError extends Error {
  readonly code: string | null;
  readonly retryable: boolean;
  constructor(message: string, code: string | null) {
    super(message);
    this.name = "EvidenceAppendError";
    this.code = code;
    this.retryable = code !== null && RETRYABLE_SQLSTATES.has(code);
  }
}

/**
 * Appends one evidence event to a learner's node state inside the
 * graph.append_evidence transaction (ros-ai-access, migration
 * 20260921010000). The function locks or creates the row, so two writers on
 * the same learner and node keep both events; the read-then-upsert this
 * replaced let the second writer erase the first.
 *
 * Stage is monotone by default, matching stages.ts, where a transition
 * never moves a learner backward. A teacher override is the one caller that
 * lowers a stage on purpose and passes `monotone: false`.
 *
 * A lock wait raises a retryable error, which this retries once before it
 * throws. A caller that reports a durable result to the person in front of
 * it has to let that throw reach them.
 */
export async function recordEvidence(
  learnerId: string,
  nodeId: string,
  nextStage: string,
  event: Record<string, unknown>,
  options: { monotone?: boolean } = {},
): Promise<EvidenceAppend> {
  const svc = graphService();
  const args = {
    p_learner: learnerId,
    p_node: nodeId,
    p_stage: nextStage || "",
    p_event: event,
    p_monotone: options.monotone !== false,
  };

  type AppendRow = {
    prior_stage?: string | null;
    stage?: string;
    created?: boolean;
    award_from?: string | null;
    awards?: boolean;
    deleted?: boolean;
    event_count?: number;
  };
  let last: EvidenceAppendError | null = null;
  let row: AppendRow | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await svc.rpc("append_evidence", args);
    if (!error) {
      row = (data || {}) as AppendRow;
      last = null;
      break;
    }
    const code = (error as { code?: string }).code ?? null;
    // PGRST202 and 42883 both mean the function is missing, which happens
    // when a deploy lands before its migration. Say so, since the fix is to
    // apply the migration rather than to retry.
    if (code === "PGRST202" || code === "42883") {
      throw new EvidenceAppendError(
        "recordEvidence: graph.append_evidence is missing; apply supabase/migrations/20260921010000_research_os_evidence_append.sql before deploying this build",
        code,
      );
    }
    // The database's message can carry the function body, so the error the
    // caller sees names the code and the first line alone.
    const first = (error.message || "append failed").split("\n")[0].slice(0, 200);
    last = new EvidenceAppendError(`recordEvidence: append failed (${code ?? "unknown"}): ${first}`, code);
    if (!last.retryable) break;
    await new Promise((r) => setTimeout(r, 120));
  }
  if (last) throw last;

  if (row?.deleted === true) {
    throw new EvidenceAppendError(
      `recordEvidence: learner ${learnerId} was deleted while the event was being written`,
      "LEARNER_DELETED",
    );
  }

  const result: EvidenceAppend = {
    priorStage: (row?.prior_stage as Stage | null) ?? null,
    stage: (row?.stage as Stage) ?? ((nextStage || "access") as Stage),
    created: row?.created === true,
    awardFrom: (row?.award_from as Stage | null) ?? null,
    awards: row?.awards === true,
    eventCount: row?.event_count ?? 0,
  };

  // ros-33: the game layer reads every recorded transition here. Activity
  // follows every event, so a check or a quote keeps a streak alive. XP and
  // badges follow the node's high-water mark, so a teacher demotion and the
  // re-climb after it award nothing already credited. Awarding never fails
  // the evidence write.
  try {
    await awardProgress(learnerId, nodeId, result.awardFrom, result.stage, { xp: result.awards });
  } catch (err) {
    // A missing profile row is ordinary. Anything else loses a learner's
    // XP or streak quietly, so it says so.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("update failed")) {
      console.warn(`[research-os] awardProgress failed for learner ${learnerId} node ${nodeId}: ${message}`);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// The game layer (bkt-ros ros-33). Rules in src/lib/research-os/game.ts.
// ---------------------------------------------------------------------------

export async function loadGame(learnerId: string): Promise<GameState | null> {
  const { data, error } = await graphService()
    .from("learner_profiles")
    .select("xp,streak_days,last_active_day,badges")
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { xp: number | null; streak_days: number | null; last_active_day: string | null; badges: Badge[] | null };
  return { xp: row.xp ?? 0, streakDays: row.streak_days ?? 0, lastActiveDay: row.last_active_day, badges: Array.isArray(row.badges) ? row.badges : [] };
}

/**
 * Adds one transition's XP, streak and badges to a learner's profile.
 *
 * The read and the write are separate statements, so the update names the
 * xp it read and retries when another award moved it first. Without that,
 * two evidence events landing together each read the same xp and one award
 * is lost, which is the same shape the evidence append itself fixed one
 * layer down (Bucket critic ROS194-14).
 */
export async function awardProgress(
  learnerId: string,
  nodeId: string,
  from: Stage | null,
  to: Stage,
  options: { xp?: boolean } = {},
): Promise<void> {
  const withXp = options.xp !== false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = (await loadGame(learnerId)) ?? { xp: 0, streakDays: 0, lastActiveDay: null, badges: [] };
    const moved = applyTransition(current, nodeId, from, to);
    // An event that credits nothing still says the learner was here today.
    const next = withXp ? moved : { ...moved, xp: current.xp, badges: current.badges };
    const { data, error } = await graphService()
      .from("learner_profiles")
      .update({ xp: next.xp, streak_days: next.streakDays, last_active_day: next.lastActiveDay, badges: next.badges })
      .eq("learner_id", learnerId)
      .eq("xp", current.xp)
      .eq("streak_days", current.streakDays)
      .select("learner_id");
    if (error) throw new Error(`awardProgress: update failed: ${error.message}`);
    if ((data || []).length > 0) return;
    // No row matched: either the profile is missing, or another award moved
    // xp between the read and the write. Tell those apart before retrying.
    const { data: exists } = await graphService()
      .from("learner_profiles")
      .select("learner_id")
      .eq("learner_id", learnerId)
      .maybeSingle();
    if (!exists) return;
  }
  throw new Error("awardProgress: xp moved under four attempts");
}

/** XP per learner for a class leaderboard; missing profiles read as 0. */
export async function loadXpForLearners(learnerIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (learnerIds.length === 0) return out;
  const { data, error } = await graphService().from("learner_profiles").select("learner_id,xp").in("learner_id", learnerIds);
  if (error) return out;
  for (const r of (data as { learner_id: string; xp: number | null }[]) || []) out.set(r.learner_id, r.xp ?? 0);
  return out;
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
