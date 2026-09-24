import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { admissionRow, runRevision } from "../../../src/lib/research-os/medallion/bronze";
import { SILVER_CONFLICT } from "../../../src/lib/research-os/medallion/plan";
import { nodeProposalRow } from "../../../src/lib/research-os/medallion/proposals";
import { HISTORY_PARSER, HISTORY_SOURCES, planHistory, silverKeyOf, type HistoryPlan, type HistorySilver, type NodeRef } from "../../../src/lib/history/importer";
import { graphClient } from "../ingest/lib/medallion-shadow";
import { loadPolicy, repoIO } from "../medallion/lib/repo-io";

const LABEL = "history-import";
const SUBJECT_KINDS = ["figure", "site", "primary_source", "event"];

export interface ImportReport {
  plan: Record<string, number>;
  bronze: { staged: number; activated: number; unchanged: number; refused: number };
  written: { places: number; silver: number; proposals: number; factoids: number; preferred: number };
}

async function all<T>(svc: SupabaseClient, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = svc.from(table).select(columns).order("id").range(page.from, page.to);
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  });
}

export function readSources(): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const s of HISTORY_SOURCES) {
    const bytes = repoIO.readFile(s.repoPath);
    if (!bytes) throw new Error(`[${LABEL}] ${s.repoPath} is missing`);
    files.set(s.repoPath, bytes);
  }
  return files;
}

async function silverIdsFor(svc: SupabaseClient, rows: HistorySilver[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sources = Array.from(new Set(rows.map((r) => r.source_id)));
  const found = await all<HistorySilver & { id: string }>(svc, "silver_items", "id,source_id,source_revision,parser,parser_revision,kind,span_start,span_end,subject", (q) =>
    q.in("source_id", sources).eq("parser", HISTORY_PARSER),
  );
  for (const r of found) out.set(silverKeyOf(r), r.id);
  return out;
}

export async function runImport(svc: SupabaseClient, apply: boolean): Promise<{ plan: HistoryPlan; report: ImportReport }> {
  const { policy, sha256 } = loadPolicy();
  const nodes = await all<NodeRef & { id: string }>(svc, "nodes", "id,slug,title,kind", (q) => q.in("kind", SUBJECT_KINDS));
  const plan = planHistory({ files: readSources(), policy, nodes });
  const report: ImportReport = {
    plan: plan.counts,
    bronze: { staged: 0, activated: 0, unchanged: 0, refused: 0 },
    written: { places: 0, silver: 0, proposals: 0, factoids: 0, preferred: 0 },
  };
  if (!apply) return { plan, report };

  const { data: admitted, error: admitErr } = await svc.rpc("admit_bronze_sources", {
    p_run_revision: runRevision(plan.bronze),
    p_policy_sha256: sha256,
    p_policy_status: policy.status,
    p_rows: plan.bronze.map(admissionRow),
  });
  if (admitErr) throw new Error(`bronze admission failed: ${admitErr.message}`);
  const a = admitted as { staged: number; activated: number; unchanged: number; refused: { source_id: string; reason: string }[] };
  report.bronze = { staged: a.staged, activated: a.activated, unchanged: a.unchanged, refused: a.refused.length };
  if (a.refused.length) throw new Error(`bronze refused: ${a.refused.map((r) => `${r.source_id} (${r.reason})`).join("; ")}`);

  const sourceOf = new Map(plan.bronze.map((b) => [b.repoPath, b]));
  const nodeId = new Map(nodes.map((n) => [n.slug, n.id]));
  const placeRows = plan.places.map((p) => {
    const b = sourceOf.get(p.repoPath)!;
    return { slug: p.slug, title: p.title, lat: p.lat, lng: p.lng, site_node_id: p.siteSlug ? nodeId.get(p.siteSlug) ?? null : null, source_id: b.sourceId, source_revision: b.sourceRevision };
  });
  for (let i = 0; i < placeRows.length; i += 200) {
    const { data, error } = await svc.from("places").upsert(placeRows.slice(i, i + 200), { onConflict: "slug", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`place write failed: ${error.message}`);
    report.written.places += (data ?? []).length;
  }

  for (let i = 0; i < plan.silver.length; i += 200) {
    const { data, error } = await svc.from("silver_items").upsert(plan.silver.slice(i, i + 200), { onConflict: SILVER_CONFLICT, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`silver write failed: ${error.message}`);
    report.written.silver += (data ?? []).length;
  }
  const ids = await silverIdsFor(svc, plan.silver);

  const proposalRows = plan.proposals.map((p) => nodeProposalRow(LABEL, p.draft, p.silver, ids.get(silverKeyOf(p.silver)) ?? null));
  for (let i = 0; i < proposalRows.length; i += 200) {
    const { data, error } = await svc.from("node_proposals").upsert(proposalRows.slice(i, i + 200), { onConflict: "key", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`node proposal write failed: ${error.message}`);
    report.written.proposals += (data ?? []).length;
  }

  for (const p of plan.promotions) {
    const silverId = ids.get(silverKeyOf(p.silver));
    if (!silverId) throw new Error(`silver item for ${p.silver.proposal.record} was not written`);
    const { data, error } = await svc.rpc("promote_history_factoid", { p_silver: silverId, p_reviewer: null, p_preferred: false });
    if (error) throw new Error(`promotion of ${p.silver.proposal.record} failed: ${error.message}`);
    const r = data as { ok: boolean; error?: string; inserted?: number };
    if (!r.ok) throw new Error(`promotion of ${p.silver.proposal.record} refused: ${r.error}`);
    report.written.factoids += r.inserted ?? 0;
    for (const role of p.preferredRoles) {
      const { data: pref, error: prefErr } = await svc.rpc("prefer_history_factoid", { p_silver: silverId, p_role: role, p_reviewer: null, p_importer: "history-import" });
      if (prefErr) throw new Error(`prefer ${p.silver.proposal.record} ${role} failed: ${prefErr.message}`);
      const pr = pref as { ok: boolean; changed?: boolean; error?: string };
      if (!pr.ok) throw new Error(`prefer ${p.silver.proposal.record} ${role} refused: ${pr.error}`);
      if (pr.changed) report.written.preferred += 1;
    }
  }
  return { plan, report };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const svc = graphClient(LABEL);
  const { report } = await runImport(svc, apply);
  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log(`[${LABEL}] dry run, nothing written. Pass --apply to write.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[${LABEL}] FAILED:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
