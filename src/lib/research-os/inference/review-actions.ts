/**
 * The review actions behind /api/research-os/edges and
 * /api/research-os/node-proposals (ros-prime 2, learning/research-os/
 * PRIMES.md "Slice 2"). Each takes the service client as a parameter, so
 * scripts/test-research-os-review-actions.ts runs them against an in-memory
 * fake; the routes add only the reviewer gate and the JSON response.
 *
 * Every decision is claimed first with an update that only matches a
 * pending row, so two reviewers acting at once cannot both decide one
 * proposal. The edge or node is written after the claim, and the claim is
 * released if that write fails. When the release or the cleanup itself
 * fails, the error code says so ("..._claim_held", "..._node_left"), so a
 * half-applied decision reads as half-applied.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { IN_CHUNK } from "../db";
import { allPendingPairs, forgetMakeupSnapshot, liveCycles, makeupSnapshot, pairStandings, type PairStanding } from "../makeup";
import { rebuildPrereqAncestorForBranch } from "../rebuild-ancestor";
import { decideEdgeProposal, TEACHER_APPROVED_CONFIDENCE, type ApprovedKind } from "./decide";
import { chooseBranch, decideNodeProposal, type NodeOverrides, type NodeProposalRecord } from "./decide-node";

export type ActionResult = { status: number; body: Record<string, unknown> };

const ok = (body: Record<string, unknown>): ActionResult => ({ status: 200, body });
const fail = (status: number, error: string): ActionResult => ({ status, body: { error } });

/**
 * A claim that matched no pending row lost to another decision, or repeats
 * this reviewer's own. Report the status the row holds now, or a null
 * decision when that read fails.
 */
async function lostClaim(svc: SupabaseClient, table: string, id: string): Promise<ActionResult> {
  const { data, error } = await svc.from(table).select("status").eq("id", id).maybeSingle();
  const status = !error && data ? ((data as { status?: unknown }).status ?? null) : null;
  return ok({ decision: typeof status === "string" ? status : null, alreadyDecided: true });
}

export const SOURCES = new Set(["inferred_llm", "prime_decompose_llm"]);
export const KINDS = new Set<ApprovedKind>(["prerequisite", "derives_from"]);

const PROPOSAL_COLUMNS =
  "id,from_slug,to_slug,branch,confidence,confidence_source,agreement,justification,secondary_justification,model,prompt_hash,status,created_at,impact,cross_branch,verification,origin,refd,in_cycle";

type ProposalRow = {
  id: string;
  from_slug: string;
  to_slug: string;
  branch: string;
  confidence: number;
  confidence_source: string;
  agreement: boolean;
  justification: string;
  secondary_justification: string | null;
  model: string;
  prompt_hash: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  impact: number;
  cross_branch: boolean;
  verification: "confirmed" | "refuted" | "unchecked" | null;
  origin: "proposer" | "missing_matched" | "base_idea" | null;
  refd: number | null;
  in_cycle: boolean | null;
};

type NodeLite = { id: string; slug: string; title: string; branch: string; tier: number | null; summary: string | null };

/** Rows for a list of values, a chunk at a time, checking every error. */
async function chunked<T>(values: string[], run: (chunk: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await run(values.slice(i, i + IN_CHUNK));
    if (error) throw new Error(error.message);
    out.push(...(((data as T[]) || []) as T[]));
  }
  return out;
}

async function nodesBySlug(svc: SupabaseClient, slugs: string[]): Promise<Map<string, NodeLite>> {
  const rows = await chunked<NodeLite>(Array.from(new Set(slugs)), (c) => svc.from("nodes").select("id,slug,title,branch,tier,summary").in("slug", c));
  return new Map(rows.map((r) => [r.slug, r]));
}

/** Idea nodes resting on each slug (graph.idea_dependents), counted now. */
async function dependents(svc: SupabaseClient, slugs: string[]): Promise<Map<string, number>> {
  if (!slugs.length) return new Map();
  const { data, error } = await svc.rpc("idea_dependents", { p_slugs: Array.from(new Set(slugs)) });
  if (error) throw new Error(error.message);
  return new Map(((data as Array<{ slug: string; dependents: number }>) || []).map((r) => [r.slug, Number(r.dependents)]));
}

async function knownBranches(svc: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc.from("nodes").select("branch").order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data as Array<{ branch: string }>) || [];
    for (const r of page) out.add(r.branch);
    if (page.length < 1000) return out;
  }
}

/**
 * How much a reviewer's decision is worth now. Liang and colleagues (2018)
 * found a labeler's effort goes furthest on the pairs the models are least
 * sure of; weighting by the decompositions a pair reaches puts the
 * uncertain, far-reaching pairs first.
 */
export function priorityOf(p: { verification: ProposalRow["verification"]; agreement: boolean }, impact: number): number {
  const uncertainty = p.verification === "refuted" ? 1 : p.verification === "unchecked" ? 0.9 : p.verification === "confirmed" ? 0.6 : p.agreement ? 0.6 : 1;
  return Math.round((1 + Math.log2(1 + Math.max(0, impact))) * uncertainty * 1000) / 1000;
}

export async function listEdgeProposals(svc: SupabaseClient, source: string | null): Promise<ActionResult> {
  if (source && !SOURCES.has(source)) return fail(400, "unknown source");
  const rows: ProposalRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = svc.from("edge_proposals").select(PROPOSAL_COLUMNS).eq("status", "pending");
    if (source) q = q.eq("confidence_source", source);
    const { data, error } = await q.order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, from + 999);
    if (error) return fail(500, "read_failed");
    const page = (data as ProposalRow[]) || [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  let nodes: Map<string, NodeLite>;
  let impact: Map<string, number>;
  let loops: Set<string>;
  let standings: Map<string, PairStanding>;
  try {
    nodes = await nodesBySlug(svc, rows.flatMap((p) => [p.from_slug, p.to_slug]));
    impact = await dependents(svc, rows.map((p) => p.to_slug));
    // Loops are computed over every pending pair and the graph as they
    // stand now, so a decision clears or adds a flag at once.
    const pendingAll = source ? await allPendingPairs(svc) : rows;
    const snap = await makeupSnapshot(svc);
    loops = liveCycles(snap, pendingAll);
    standings = pairStandings(snap, pendingAll);
  } catch {
    return fail(500, "read_failed");
  }
  const proposals = rows
    .map((p) => {
      const live = impact.get(p.to_slug) ?? 0;
      const from = nodes.get(p.from_slug);
      const to = nodes.get(p.to_slug);
      return {
        id: p.id,
        fromSlug: p.from_slug,
        fromTitle: from?.title ?? p.from_slug,
        fromSummary: from?.summary ?? null,
        fromBranch: from?.branch ?? null,
        fromTier: from?.tier ?? null,
        toSlug: p.to_slug,
        toTier: to?.tier ?? null,
        toTitle: to?.title ?? p.to_slug,
        branch: p.branch,
        confidence: p.confidence,
        confidenceSource: p.confidence_source,
        agreement: p.agreement,
        verification: p.verification,
        origin: p.origin,
        refd: p.refd,
        justification: p.justification,
        secondaryJustification: p.secondary_justification,
        model: p.model,
        promptHash: p.prompt_hash,
        createdAt: p.created_at,
        impact: live,
        crossBranch: p.cross_branch,
        inCycle: loops.has(`${p.from_slug}->${p.to_slug}`),
        ...(standings.get(`${p.from_slug}->${p.to_slug}`) ?? { graphLoop: false, implied: false, viaPending: false, through: [] }),
        priority: priorityOf(p, live),
      };
    })
    .sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return ok({ proposals });
}

async function branchesResting(svc: SupabaseClient, targetId: string): Promise<Set<string>> {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc.from("prereq_ancestor").select("node_id").eq("ancestor_id", targetId).order("node_id").range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data as Array<{ node_id: string }>) || [];
    ids.push(...page.map((r) => r.node_id));
    if (page.length < 1000) break;
  }
  const rows = await chunked<{ branch: string }>(ids, (c) => svc.from("nodes").select("branch").in("id", c));
  return new Set(rows.map((r) => r.branch));
}

export async function decideEdge(
  svc: SupabaseClient,
  input: { id: string; decision: "approved" | "rejected"; kind?: ApprovedKind; reason: string | null; reviewerId: string },
): Promise<ActionResult> {
  const { data: row, error: readErr } = await svc
    .from("edge_proposals")
    .select("id,from_slug,to_slug,branch,status,confidence_source,model,verification,origin")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr) return fail(500, "read_failed");
  if (!row) return fail(404, "proposal_not_found");
  const p = row as Pick<ProposalRow, "id" | "from_slug" | "to_slug" | "branch" | "status" | "confidence_source" | "model" | "verification" | "origin">;
  // Decomposition proposals say what a node rests on, so they default to
  // derives_from; lexical inference proposes learning order.
  const kind: ApprovedKind = input.kind ?? (p.confidence_source === "prime_decompose_llm" ? "derives_from" : "prerequisite");
  if (!KINDS.has(kind)) return fail(400, "kind must be prerequisite or derives_from");
  const outcome = decideEdgeProposal({ status: p.status, fromSlug: p.from_slug, toSlug: p.to_slug }, input.decision, kind);
  if (outcome.alreadyDecided) return ok({ decision: outcome.status, alreadyDecided: true });

  const decidedAt = new Date().toISOString();
  const claim = async (patch: Record<string, unknown>) => {
    const { data, error } = await svc.from("edge_proposals").update(patch).eq("id", p.id).eq("status", "pending").select("id");
    if (error) throw new Error(error.message);
    return ((data as unknown[]) || []).length > 0;
  };
  const release = async (): Promise<boolean> => {
    const { error } = await svc
      .from("edge_proposals")
      .update({ status: "pending", decided_kind: null, reviewer_id: null, decision_reason: null, decided_at: null })
      .eq("id", p.id);
    return !error;
  };

  if (!outcome.edgeToWrite) {
    try {
      if (!(await claim({ status: "rejected", reviewer_id: input.reviewerId, decision_reason: input.reason, decided_at: decidedAt })))
        return lostClaim(svc, "edge_proposals", p.id);
    } catch {
      return fail(500, "decision_write_failed");
    }
    return ok({ decision: "rejected", alreadyDecided: false });
  }

  let factor: NodeLite | undefined;
  let target: NodeLite | undefined;
  try {
    const found = await nodesBySlug(svc, [p.from_slug, p.to_slug]);
    factor = found.get(p.from_slug);
    target = found.get(p.to_slug);
  } catch {
    return fail(500, "read_failed");
  }
  if (!factor || !target) return fail(404, "node_not_found");
  // The factor already resting on the target, through any prerequisite or
  // derives_from chain, would make this edge close a cycle.
  const { data: loop, error: loopErr } = await svc.rpc("rests_on", { p_node: factor.id, p_factor: target.id });
  if (loopErr) return fail(500, "read_failed");
  if (factor.id === target.id || loop === true) return fail(409, "would_close_cycle");

  try {
    if (!(await claim({ status: "approved", decided_kind: kind, reviewer_id: input.reviewerId, decision_reason: input.reason, decided_at: decidedAt })))
      return lostClaim(svc, "edge_proposals", p.id);
  } catch {
    return fail(500, "decision_write_failed");
  }
  // A concurrent approval of the reverse pair can land between the check
  // above and the claim; checking again after the claim narrows that window
  // to the edge write itself.
  const { data: loopAfter, error: loopAfterErr } = await svc.rpc("rests_on", { p_node: factor.id, p_factor: target.id });
  if (loopAfterErr || loopAfter === true) {
    const released = await release();
    if (!released) return fail(500, "read_failed_claim_held");
    return loopAfterErr ? fail(500, "read_failed") : fail(409, "would_close_cycle");
  }
  const e = outcome.edgeToWrite;
  const bySlug = new Map([
    [factor.slug, factor],
    [target.slug, target],
  ]);
  const { error: edgeErr } = await svc.from("edges").upsert(
    [
      {
        from_id: bySlug.get(e.fromSlug)!.id,
        to_id: bySlug.get(e.toSlug)!.id,
        kind: e.kind,
        confidence: TEACHER_APPROVED_CONFIDENCE,
        confidence_source: "teacher",
        provenance: {
          type: "edge_proposal",
          proposal_id: p.id,
          proposed_by: p.confidence_source,
          model: p.model,
          verification: p.verification,
          origin: p.origin,
          reviewer_id: input.reviewerId,
        },
      },
    ],
    { onConflict: "from_id,to_id,kind", ignoreDuplicates: true },
  );
  if (edgeErr) return fail(500, (await release()) ? "edge_write_failed" : "edge_write_failed_claim_held");
  // A prerequisite edge changes the ancestor closure of the target's branch
  // and of every branch holding a node that rests on the target; a
  // derives_from edge leaves learning order, and the closure, alone.
  forgetMakeupSnapshot();
  // The edge stands either way; a failed rebuild leaves routing stale, so
  // the reply carries a warning the page shows.
  const stale: string[] = [];
  if (e.kind === "prerequisite") {
    const branches = new Set<string>([target.branch]);
    let lookupFailed = false;
    try {
      for (const b of Array.from(await branchesResting(svc, target.id))) branches.add(b);
    } catch (err) {
      lookupFailed = true;
      console.error("[research-os/edges] dependent lookup failed:", (err as Error).message);
    }
    for (const b of Array.from(branches)) {
      try {
        await rebuildPrereqAncestorForBranch(svc, b);
      } catch (err) {
        stale.push(b);
        console.error(`[research-os/edges] prereq_ancestor rebuild failed for ${b}:`, (err as Error).message);
      }
    }
    if (lookupFailed) stale.push("branches resting on the target");
  }
  return ok({
    decision: "approved",
    alreadyDecided: false,
    kind,
    ...(stale.length
      ? { warning: `learning order was not rebuilt for ${stale.join(", ")}; run scripts/rebuild-prereq-ancestor.ts --all` }
      : {}),
  });
}

const NODE_COLUMNS = "id,key,title,branch,justification,summary,named_by,aliases,reasons,possible_duplicates,base_match,model,status,created_at";

type NodeProposalRow = {
  id: string;
  key: string;
  title: string;
  branch: string;
  justification: string;
  summary: string | null;
  named_by: string[];
  aliases: string[];
  reasons: Record<string, string>;
  possible_duplicates: { slug: string; title: string; similarity: number }[];
  base_match: string | null;
  model: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function listNodeProposals(svc: SupabaseClient): Promise<ActionResult> {
  const rows: NodeProposalRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc.from("node_proposals").select(NODE_COLUMNS).eq("status", "pending").order("id").range(from, from + 999);
    if (error) return fail(500, "read_failed");
    const page = (data as NodeProposalRow[]) || [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  rows.sort((a, b) => b.named_by.length - a.named_by.length || a.key.localeCompare(b.key));
  let nodes: Map<string, NodeLite>;
  let known: Set<string>;
  try {
    nodes = await nodesBySlug(svc, rows.flatMap((r) => r.named_by));
    known = await knownBranches(svc);
  } catch {
    return fail(500, "read_failed");
  }
  return ok({
    branches: Array.from(known).sort(),
    proposals: rows.map((r) => ({
      id: r.id,
      key: r.key,
      title: r.title,
      branch: r.branch,
      branchToCreate: chooseBranch(r.branch, known, r.named_by.map((s) => nodes.get(s)?.branch ?? null)),
      justification: r.justification,
      summary: r.summary,
      aliases: r.aliases,
      possibleDuplicates: r.possible_duplicates,
      baseMatch: r.base_match,
      model: r.model,
      namedBy: r.named_by.map((slug) => ({ slug, title: nodes.get(slug)?.title ?? slug, reason: r.reasons[slug] ?? null })),
      createdAt: r.created_at,
    })),
  });
}

export async function decideNode(
  svc: SupabaseClient,
  input: { id: string; decision: "approved" | "rejected"; reason: string | null; reviewerId: string; overrides?: NodeOverrides },
): Promise<ActionResult> {
  const { data: row, error: readErr } = await svc.from("node_proposals").select(NODE_COLUMNS).eq("id", input.id).maybeSingle();
  if (readErr) return fail(500, "read_failed");
  if (!row) return fail(404, "proposal_not_found");
  const r = row as NodeProposalRow;
  let targets: Map<string, NodeLite>;
  let known: Set<string>;
  let impact: Map<string, number>;
  try {
    targets = await nodesBySlug(svc, r.named_by);
    known = await knownBranches(svc);
    impact = await dependents(svc, r.named_by);
  } catch {
    return fail(500, "read_failed");
  }
  if (input.overrides?.branch && !known.has(input.overrides.branch)) return fail(400, "unknown branch");
  const namedBy = r.named_by.filter((s) => targets.has(s));
  const branch = chooseBranch(r.branch, known, namedBy.map((s) => targets.get(s)!.branch));
  const record: NodeProposalRecord = {
    status: r.status,
    key: r.key,
    title: r.title,
    branch: r.branch,
    justification: r.justification,
    summary: r.summary,
    namedBy,
    aliases: r.aliases,
    reasons: r.reasons,
    baseMatch: r.base_match,
    model: r.model,
  };
  const outcome = decideNodeProposal(record, input.decision, {
    proposalId: r.id,
    branch,
    branchOf: new Map(namedBy.map((s) => [s, targets.get(s)!.branch])),
    tierOf: new Map(namedBy.map((s) => [s, targets.get(s)!.tier])),
    impactOf: impact,
    overrides: input.overrides,
  });
  if (outcome.alreadyDecided) return ok({ decision: outcome.status, alreadyDecided: true });
  if (outcome.error === "summary_required") return fail(400, "a definition is required to create the node");

  const decidedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await svc
    .from("node_proposals")
    .update({ status: outcome.status, reviewer_id: input.reviewerId, decision_reason: input.reason, decided_at: decidedAt })
    .eq("id", r.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return fail(500, "decision_write_failed");
  if (!((claimed as unknown[]) || []).length) return lostClaim(svc, "node_proposals", r.id);
  if (!outcome.nodeToCreate) return ok({ decision: outcome.status, alreadyDecided: false });

  const release = async (): Promise<boolean> => {
    const { error } = await svc
      .from("node_proposals")
      .update({ status: "pending", reviewer_id: null, decision_reason: null, decided_at: null, created_node_id: null })
      .eq("id", r.id);
    return !error;
  };
  const n = outcome.nodeToCreate;
  let nodeId: string;
  let created = false;
  const { data: existing, error: existErr } = await svc.from("nodes").select("id").eq("slug", n.slug).maybeSingle();
  if (existErr) return fail(500, (await release()) ? "read_failed" : "read_failed_claim_held");
  if (existing) nodeId = (existing as { id: string }).id;
  else {
    const { data: inserted, error: insErr } = await svc
      .from("nodes")
      .insert([{ slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary, labels: n.labels, provenance: n.provenance }])
      .select("id")
      .single();
    if (insErr || !inserted) return fail(500, (await release()) ? "node_write_failed" : "node_write_failed_claim_held");
    nodeId = (inserted as { id: string }).id;
    created = true;
  }
  let queuedEdges = 0;
  if (outcome.edgeProposals?.length) {
    const { data: queuedRows, error: epErr } = await svc
      .from("edge_proposals")
      .upsert(outcome.edgeProposals, { onConflict: "from_slug,to_slug", ignoreDuplicates: true })
      .select("id");
    queuedEdges = ((queuedRows as unknown[]) || []).length;
    if (epErr) {
      let nodeLeft = false;
      if (created) {
        const { error: delErr } = await svc.from("nodes").delete().eq("id", nodeId);
        nodeLeft = !!delErr;
      }
      const released = await release();
      if (nodeLeft) return { status: 500, body: { error: "edge_proposal_write_failed_node_left", nodeSlug: n.slug, claimHeld: !released } };
      return fail(500, released ? "edge_proposal_write_failed" : "edge_proposal_write_failed_claim_held");
    }
  }
  forgetMakeupSnapshot();
  const { error: linkErr } = await svc.from("node_proposals").update({ created_node_id: nodeId }).eq("id", r.id);
  return ok({
    decision: "approved",
    alreadyDecided: false,
    nodeSlug: n.slug,
    nodeTier: n.tier,
    // True when a node with this slug existed and the approval linked to it.
    reused: !created,
    queuedEdges,
    // The node and its proposals exist; only the back link failed, so a
    // later run cannot queue new pairs from this node until it is set.
    ...(linkErr ? { warning: "the proposal's link to its new node was not saved" } : {}),
  });
}

type IrreducibleRow = { id: string; node_slug: string; justification: string; model: string; status: "pending" | "confirmed" | "rejected"; created_at: string };

/** Nodes the proposer called irreducible, waiting on a reviewer, the ones most rested on first. */
export async function listIrreducible(svc: SupabaseClient): Promise<ActionResult> {
  const rows: IrreducibleRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc.from("irreducible_proposals").select("id,node_slug,justification,model,status,created_at").eq("status", "pending").order("id").range(from, from + 999);
    if (error) return fail(500, "read_failed");
    const page = (data as IrreducibleRow[]) || [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  let nodes: Map<string, NodeLite>;
  let impact: Map<string, number>;
  try {
    nodes = await nodesBySlug(svc, rows.map((r) => r.node_slug));
    impact = await dependents(svc, rows.map((r) => r.node_slug));
  } catch {
    return fail(500, "read_failed");
  }
  return ok({
    proposals: rows
      .map((r) => ({
        id: r.id,
        slug: r.node_slug,
        title: nodes.get(r.node_slug)?.title ?? r.node_slug,
        branch: nodes.get(r.node_slug)?.branch ?? null,
        summary: nodes.get(r.node_slug)?.summary ?? null,
        justification: r.justification,
        model: r.model,
        dependents: impact.get(r.node_slug) ?? 0,
      }))
      .sort((a, b) => b.dependents - a.dependents || a.title.localeCompare(b.title)),
  });
}

/**
 * Confirm or reject an irreducible verdict. A confirmed node is a prime by
 * review: the decompose-further queue leaves it out of its targets. A
 * rejected one returns to the queue on the next run.
 */
export async function decideIrreducible(
  svc: SupabaseClient,
  input: { id: string; decision: "confirmed" | "rejected"; reason: string | null; reviewerId: string },
): Promise<ActionResult> {
  const { data: row, error } = await svc.from("irreducible_proposals").select("id,status").eq("id", input.id).maybeSingle();
  if (error) return fail(500, "read_failed");
  if (!row) return fail(404, "proposal_not_found");
  const r = row as { id: string; status: IrreducibleRow["status"] };
  if (r.status !== "pending") return ok({ decision: r.status, alreadyDecided: true });
  const { data: claimed, error: claimErr } = await svc
    .from("irreducible_proposals")
    .update({ status: input.decision, reviewer_id: input.reviewerId, decision_reason: input.reason, decided_at: new Date().toISOString() })
    .eq("id", r.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return fail(500, "decision_write_failed");
  if (!((claimed as unknown[]) || []).length) return lostClaim(svc, "irreducible_proposals", r.id);
  return ok({ decision: input.decision, alreadyDecided: false });
}
