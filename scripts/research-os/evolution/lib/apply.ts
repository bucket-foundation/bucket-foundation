import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../../src/lib/research-os/paging";
import { admissionRow, runRevision } from "../../../../src/lib/research-os/medallion/bronze";
import { SILVER_CONFLICT } from "../../../../src/lib/research-os/medallion/plan";
import { nodeProposalRow } from "../../../../src/lib/research-os/medallion/proposals";
import {
  batchGate,
  batchPromotionEnabled,
  EVOLUTION_PARSER,
  silverKeyOf,
  type SilverKeyFields,
  type EdgeRef,
  type EvolutionPlan,
  type EvolutionSilver,
  type NodeRef,
} from "../../../../src/lib/evolution/importer";
import { EVOLUTION_EDGE_KINDS, EVOLUTION_NODE_KINDS } from "../../../../src/lib/research-os/evolution";

export const LABEL = "evolution-import";

export interface EvolutionReport {
  plan: Record<string, number>;
  bronze: { staged: number; activated: number; unchanged: number; refused: number };
  written: { silver: number; edgeCandidates: number; series: number; proposals: number; factoids: number; preferred: number };
}

async function all<T>(svc: SupabaseClient, table: string, columns: string, filter?: (q: any) => any, orderBy = "id"): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = svc.from(table).select(columns).order(orderBy).range(page.from, page.to);
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  });
}

export async function readGraph(svc: SupabaseClient): Promise<{ nodes: NodeRef[]; edges: EdgeRef[]; nodeIds: Map<string, string>; eolToSlug: Map<string, string> }> {
  const nodes = await all<{ id: string; slug: string; kind: string }>(svc, "nodes", "id,slug,kind", (q) => q.in("kind", [...EVOLUTION_NODE_KINDS]));
  const edges = await all<{ id: string; from_id: string; to_id: string; kind: string }>(svc, "edges", "id,from_id,to_id,kind", (q) => q.in("kind", [...EVOLUTION_EDGE_KINDS]));
  const slugOf = new Map(nodes.map((n) => [n.id, n.slug]));
  const eol = await all<{ external_id: string; node_id: string; authority: string }>(svc, "node_external_ids", "authority,external_id,node_id", (q) => q.eq("authority", "eol"), "external_id");
  return {
    nodeIds: new Map(nodes.map((n) => [n.slug, n.id])),
    eolToSlug: new Map(eol.filter((e) => slugOf.has(e.node_id)).map((e) => [e.external_id, slugOf.get(e.node_id)!])),
    nodes: nodes.map((n) => ({ slug: n.slug, kind: n.kind })),
    edges: edges
      .filter((e) => slugOf.has(e.from_id) && slugOf.has(e.to_id))
      .map((e) => ({ id: e.id, fromSlug: slugOf.get(e.from_id)!, toSlug: slugOf.get(e.to_id)!, kind: e.kind })),
  };
}

export async function silverIds(svc: SupabaseClient, rows: SilverKeyFields[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sources = Array.from(new Set(rows.map((r) => r.source_id)));
  if (sources.length === 0) return out;
  const found = await all<EvolutionSilver & { id: string }>(svc, "silver_items", "id,source_id,source_revision,parser,parser_revision,kind,span_start,span_end,subject", (q) =>
    q.in("source_id", sources).eq("parser", EVOLUTION_PARSER),
  );
  for (const r of found) out.set(silverKeyOf(r), r.id);
  return out;
}

export async function applyEvolution(svc: SupabaseClient, plan: EvolutionPlan, policy: { sha256: string; status: string }): Promise<EvolutionReport> {
  const report: EvolutionReport = {
    plan: plan.counts,
    bronze: { staged: 0, activated: 0, unchanged: 0, refused: 0 },
    written: { silver: 0, edgeCandidates: 0, series: 0, proposals: 0, factoids: 0, preferred: 0 },
  };
  if (plan.bronze.length === 0) return report;

  const { data: admitted, error: admitErr } = await svc.rpc("admit_bronze_sources", {
    p_run_revision: runRevision(plan.bronze),
    p_policy_sha256: policy.sha256,
    p_policy_status: policy.status,
    p_rows: plan.bronze.map(admissionRow),
  });
  if (admitErr) throw new Error(`bronze admission failed: ${admitErr.message}`);
  const a = admitted as { staged: number; activated: number; unchanged: number; refused: { source_id: string; reason: string }[] };
  report.bronze = { staged: a.staged, activated: a.activated, unchanged: a.unchanged, refused: a.refused.length };
  if (a.refused.length) throw new Error(`bronze refused: ${a.refused.map((r) => `${r.source_id} (${r.reason})`).join("; ")}`);

  for (let i = 0; i < plan.silver.length; i += 200) {
    const { data, error } = await svc.from("silver_items").upsert(plan.silver.slice(i, i + 200), { onConflict: SILVER_CONFLICT, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`silver write failed: ${error.message}`);
    report.written.silver += (data ?? []).length;
  }
  for (let i = 0; i < plan.edgeCandidates.length; i += 200) {
    const { data, error } = await svc.from("silver_items").upsert(plan.edgeCandidates.slice(i, i + 200), { onConflict: SILVER_CONFLICT, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`edge candidate write failed: ${error.message}`);
    report.written.edgeCandidates += (data ?? []).length;
  }

  if (plan.series.length) {
    const nodeIds = (await readGraph(svc)).nodeIds;
    const rows = plan.series.map((r) => {
      const subject = nodeIds.get(r.subjectSlug);
      if (!subject) throw new Error(`series subject ${r.subjectSlug} is not a node`);
      return { subject_id: subject, metric: r.metric, place_id: null, year: r.year, value: r.value, unit: r.unit, source_id: r.sourceId, source_revision: r.sourceRevision, run_hash: r.runHash };
    });
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await svc
        .from("evolution_series")
        .upsert(rows.slice(i, i + 500), { onConflict: "subject_id,metric,place_id,year,source_id,source_revision", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`series write failed: ${error.message}`);
      report.written.series += (data ?? []).length;
    }
  }

  const ids = await silverIds(svc, plan.silver);

  const proposalRows = plan.proposals.map((p) => nodeProposalRow(LABEL, p.draft, p.silver, ids.get(silverKeyOf(p.silver)) ?? null));
  for (let i = 0; i < proposalRows.length; i += 200) {
    const { data, error } = await svc.from("node_proposals").upsert(proposalRows.slice(i, i + 200), { onConflict: "key", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`node proposal write failed: ${error.message}`);
    report.written.proposals += (data ?? []).length;
  }

  for (const s of plan.promotions) {
    const silverId = ids.get(silverKeyOf(s));
    if (!silverId) throw new Error(`silver item for ${s.proposal.record} was not written`);
    const { data, error } = await svc.rpc("promote_evolution_factoid", { p_silver: silverId, p_reviewer: null, p_preferred: false });
    if (error) throw new Error(`promotion of ${s.proposal.record} failed: ${error.message}`);
    const r = data as { ok: boolean; error?: string; inserted?: number };
    if (!r.ok) throw new Error(`promotion of ${s.proposal.record} refused: ${r.error}`);
    report.written.factoids += r.inserted ?? 0;
  }
  return report;
}

export type BatchDecision = { ok: true; promoted: number; upper: number } | { ok: false; reason: string; upper?: number };

export async function approveAndRunBatch(
  svc: SupabaseClient,
  input: { reviewId: string; reviewerId: string; errors: number; env?: Record<string, string | undefined> },
): Promise<BatchDecision> {
  const { data: review, error } = await svc.from("evolution_batch_reviews").select("id,source_id,source_revision,parser,role,sample_size,status").eq("id", input.reviewId).maybeSingle();
  if (error) throw new Error(`batch review read failed: ${error.message}`);
  if (!review) return { ok: false, reason: "review_not_found" };
  const r = review as { id: string; source_id: string; source_revision: string; parser: string; role: string; sample_size: number; status: string };
  if (r.status !== "pending") return { ok: false, reason: `review_${r.status}` };
  const { data: admission, error: admErr } = await svc.from("evidence_source_admissions").select("rights_rule").eq("source_id", r.source_id).eq("source_revision", r.source_revision).maybeSingle();
  if (admErr) throw new Error(`admission read failed: ${admErr.message}`);
  const rule = (admission as { rights_rule: string } | null)?.rights_rule ?? "";
  const gate = batchGate({ rule, sample: r.sample_size, errors: input.errors, enabled: batchPromotionEnabled(input.env) });
  if (!gate.ok) return { ok: false, reason: gate.reason, ...(gate.upper !== undefined ? { upper: gate.upper } : {}) };
  const { error: upErr } = await svc
    .from("evolution_batch_reviews")
    .update({ status: "approved", reviewer_id: input.reviewerId, decided_at: new Date().toISOString() })
    .eq("id", r.id)
    .eq("status", "pending");
  if (upErr) throw new Error(`batch approval failed: ${upErr.message}`);
  const { data: ran, error: runErr } = await svc.rpc("promote_evolution_batch", { p_review: r.id });
  if (runErr) throw new Error(`batch promotion failed: ${runErr.message}`);
  const out = ran as { ok: boolean; error?: string; promoted?: number };
  if (!out.ok) return { ok: false, reason: out.error ?? "batch_refused" };
  return { ok: true, promoted: out.promoted ?? 0, upper: gate.upper };
}
