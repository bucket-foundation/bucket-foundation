import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { verifyRequestUser } from "../auth/verify";
import type { GraphNode, GraphEdge, LearnerNodeState, EdgeKind, Stage } from "./types";
import type { EngineNodeDraft, GapNodeDraft, ProductionOutboxRow, GraphProductionRow } from "./engine-bridge";
import { buildProductionOutboxRow } from "./engine-bridge";
import type { PrereqAncestorRow } from "./closure";
import { applyTransition, type Badge, type GameState } from "./game";
import { readVisibility } from "./access";
import { IN_CHUNK, inChunks, pagedRead } from "./paging";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function configured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

let _svc: SupabaseClient | null = null;
export function graphService(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "graph" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

let _pub: SupabaseClient | null = null;
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

async function verifyToken(req: NextRequest): Promise<VerifiedIdentity | null> {
  return verifyRequestUser(req);
}

export async function verifyLearner(req: NextRequest): Promise<string | null> {
  const identity = await verifyToken(req);
  return identity?.id ?? null;
}

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

export { IN_CHUNK, MAX_PAGES, PAGE, PagingError, inChunks, pagedRead, type ChunkPage } from "./paging";

export async function loadSubgraph(branch: string, opts: { externalFactors?: boolean } = {}): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const svc = graphService();
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
    visibility: readVisibility(r.visibility),
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
      visibility: readVisibility(r.visibility),
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

export async function loadCurrentStage(learnerId: string, nodeId: string): Promise<Stage | null> {
  const svc = graphService();
  const { data, error } = await svc.from("learner_node_state").select("stage").eq("learner_id", learnerId).eq("node_id", nodeId).maybeSingle();
  if (error) {
    console.error("[research-os/db] learner_node_state read failed:", error.message);
    return null;
  }
  return ((data?.stage as Stage | undefined) ?? "access") as Stage;
}

export async function loadLearnerStatesForMany(learnerIds: string[], nodeIds: string[]): Promise<Map<string, LearnerNodeState[]>> {
  const out = new Map<string, LearnerNodeState[]>();
  if (learnerIds.length === 0 || nodeIds.length === 0) return out;
  const svc = graphService();
  let data: (StateRow & { learner_id: string })[];
  try {
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

interface RawClassRow {
  id: string;
  name: string;
  reviewer_email: string;
  created_at: string;
}

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

export async function loadClassPeerAcceptedClaims(learnerId: string): Promise<ClaimCandidateRow[]> {
  const svc = graphService();
  const { data: memberships, error: memErr } = await svc.from("class_members").select("class_id").eq("learner_id", learnerId);
  if (memErr) throw new Error(`loadClassPeerAcceptedClaims: membership query failed: ${memErr.message}`);
  const classIds = Array.from(new Set(((memberships as { class_id: string }[]) || []).map((m) => m.class_id)));
  if (classIds.length === 0) return [];

  let peerRows: { learner_id: string }[];
  try {
    peerRows = await inChunks<{ learner_id: string }>(classIds, (chunk, page) =>
      svc.from("class_members").select("learner_id").in("class_id", chunk).order("class_id").order("learner_id").range(page.from, page.to) as unknown as Promise<{ data: { learner_id: string }[] | null; error: { message: string } | null }>,
    );
  } catch (err) {
    throw new Error(`loadClassPeerAcceptedClaims: peer query failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const peerIds = Array.from(new Set(peerRows.map((r) => r.learner_id))).filter((id) => id !== learnerId);
  if (peerIds.length === 0) return [];

  let prodRows: { id: string; claim: string | null }[];
  try {
    prodRows = await inChunks<{ id: string; claim: string | null }>(peerIds, (chunk, page) =>
      svc.from("productions").select("id,claim").in("learner_id", chunk).eq("status", "accepted").order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; claim: string | null }[] | null; error: { message: string } | null }>,
    );
  } catch (err) {
    throw new Error(`loadClassPeerAcceptedClaims: production query failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return prodRows
    .filter((r) => (r.claim || "").trim())
    .map((r) => ({ id: r.id, claim: r.claim as string }));
}

export async function loadClassMembers(classIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (classIds.length === 0) return out;
  const svc = graphService();
  let data: { class_id: string; learner_id: string }[];
  try {
    data = await inChunks<{ class_id: string; learner_id: string }>(classIds, (chunk, page) =>
      svc.from("class_members").select("class_id,learner_id").in("class_id", chunk).order("class_id").order("learner_id").range(page.from, page.to) as unknown as Promise<{ data: { class_id: string; learner_id: string }[] | null; error: { message: string } | null }>,
    );
  } catch (err) {
    throw new Error(`loadClassMembers: query failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  for (const r of data) {
    if (!out.has(r.class_id)) out.set(r.class_id, []);
    out.get(r.class_id)!.push(r.learner_id);
  }
  return out;
}

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

export interface EvidenceAppend {
  priorStage: Stage | null;
  stage: Stage;
  created: boolean;
  awardFrom: Stage | null;
  awards: boolean;
  eventCount: number;
}

const RETRYABLE_SQLSTATES = new Set(["55P03", "40001", "40P01"]);

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
    if (code === "PGRST202" || code === "42883") {
      throw new EvidenceAppendError(
        "recordEvidence: graph.append_evidence is missing; apply supabase/migrations/20260921010000_research_os_evidence_append.sql before deploying this build",
        code,
      );
    }
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

  try {
    await awardProgress(learnerId, nodeId, result.awardFrom, result.stage, { xp: result.awards });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("update failed")) {
      console.warn(`[research-os] awardProgress failed for learner ${learnerId} node ${nodeId}: ${message}`);
    }
  }
  return result;
}

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
    const { data: exists } = await graphService()
      .from("learner_profiles")
      .select("learner_id")
      .eq("learner_id", learnerId)
      .maybeSingle();
    if (!exists) return;
  }
  throw new Error("awardProgress: xp moved under four attempts");
}

export async function loadXpForLearners(learnerIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (learnerIds.length === 0) return out;
  const { data, error } = await graphService().from("learner_profiles").select("learner_id,xp").in("learner_id", learnerIds);
  if (error) return out;
  for (const r of (data as { learner_id: string; xp: number | null }[]) || []) out.set(r.learner_id, r.xp ?? 0);
  return out;
}

export interface RecentCheckEvent {
  at: string;
  nodeId: string;
  result: "support" | "contradiction" | "unknown";
  confidence: "high" | "medium" | "low";
  abstained: boolean;
}

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

export function decideGuidanceEnabled(rows: ClassGuidanceRow[]): boolean {
  if (rows.length === 0) return true;
  return rows.some((r) => r.research_os_guidance_enabled !== false);
}

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
  }
}
