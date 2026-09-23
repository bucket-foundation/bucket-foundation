import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IngestEdgeDraft, IngestNodeDraft } from "../../../../src/lib/research-os/ingest/types";
import { admissionRow, runRevision } from "../../../../src/lib/research-os/medallion/bronze";
import { planMedallion, SILVER_CONFLICT, silverKey } from "../../../../src/lib/research-os/medallion/plan";
import type { Importer } from "../../../../src/lib/research-os/medallion/promote";
import { edgeCandidates, edgeKey, edgeProposalRow, factorAndDependent, FACTOR_KINDS, nodeProposalRow, queueable } from "../../../../src/lib/research-os/medallion/proposals";
import { HIDE_BELOW, type SilverDraft } from "../../../../src/lib/research-os/medallion/silver";
import { loadPolicy, repoIO, seedSlugs } from "../../medallion/lib/repo-io";

export const SHADOW_FLAG = "--medallion";
export const OPT_OUT_FLAG = "--no-medallion";
export const SHADOW_PARSER = "shadow";
export const SHADOW_PARSER_REVISION = "shadow/1";
const CHUNK = 60;
const SOURCE_CHUNK = 40;

export function shadowRequested(argv: string[] = process.argv, apply = argv.includes("--apply")): boolean {
  if (argv.includes(OPT_OUT_FLAG)) return false;
  return apply || argv.includes(SHADOW_FLAG);
}

export interface MedallionInput {
  nodes: IngestNodeDraft[];
  factorEdges?: IngestEdgeDraft[];
  proposedNodes?: IngestNodeDraft[];
  importer?: Importer;
}

export interface ShadowOutcome {
  failures: number;
}

export async function shadowWrite(label: string, input: IngestNodeDraft[] | MedallionInput): Promise<ShadowOutcome> {
  const payload = Array.isArray(input) ? { nodes: input } : input;
  let failures = 0;
  try {
    await writeShadow(label, payload);
  } catch (err) {
    failures = 1;
    console.error(`[${label}] medallion shadow FAILED: ${err instanceof Error ? err.message : String(err)}. Gold writes are unaffected.`);
  }
  console.log(`[${label}] medallion shadow failures: ${failures}`);
  return { failures };
}

export function graphClient(label: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`[${label}] needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; nothing written`);
  return createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
}

export async function existingNodeIds(svc: SupabaseClient, slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(slugs));
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await svc.from("nodes").select("id,slug").in("slug", unique.slice(i, i + CHUNK));
    if (error) throw new Error(`slug lookup failed: ${error.message}`);
    ((data as { id: string; slug: string }[]) || []).forEach((r) => out.set(r.slug, r.id));
  }
  return out;
}

export async function existingFactorEdges(svc: SupabaseClient, edges: IngestEdgeDraft[]): Promise<Set<string>> {
  const factor = edges.filter((e) => FACTOR_KINDS.has(e.kind));
  const ids = await existingNodeIds(svc, factor.flatMap((e) => [e.fromSlug, e.toSlug]));
  const slugOf = new Map(Array.from(ids.entries()).map(([slug, id]) => [id, slug]));
  const fromIds = Array.from(new Set(factor.map((e) => ids.get(e.fromSlug)).filter((v): v is string => !!v)));
  const out = new Set<string>();
  for (let i = 0; i < fromIds.length; i += CHUNK) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc
        .from("edges")
        .select("id,from_id,to_id,kind")
        .in("from_id", fromIds.slice(i, i + CHUNK))
        .in("kind", Array.from(FACTOR_KINDS))
        .order("id")
        .range(from, from + 999);
      if (error) throw new Error(`edge lookup failed: ${error.message}`);
      const page = (data as { from_id: string; to_id: string; kind: string }[]) || [];
      for (const r of page) {
        const f = slugOf.get(r.from_id);
        const t = slugOf.get(r.to_id);
        if (f && t) out.add(edgeKey({ fromSlug: f, toSlug: t, kind: r.kind }));
      }
      if (page.length < 1000) break;
    }
  }
  return out;
}

export async function silverIds(svc: SupabaseClient, rows: SilverDraft[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sources = Array.from(new Set(rows.map((r) => r.source_id)));
  const parsers = Array.from(new Set(rows.map((r) => r.parser)));
  for (let i = 0; i < sources.length; i += SOURCE_CHUNK) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc
        .from("silver_items")
        .select("id,source_id,source_revision,parser,parser_revision,kind,span_start,span_end,subject")
        .in("source_id", sources.slice(i, i + SOURCE_CHUNK))
        .in("parser", parsers)
        .order("id")
        .range(from, from + 999);
      if (error) throw new Error(`silver lookup failed: ${error.message}`);
      const page = (data as (SilverDraft & { id: string })[]) || [];
      for (const r of page) out.set(silverKey(r), r.id);
      if (page.length < 1000) break;
    }
  }
  return out;
}

export async function insertNodeLineage(
  svc: SupabaseClient,
  pairs: { nodeId: string; silverId: string }[],
  promoted: { promoted_by: "importer" | "backfill"; importer?: Importer },
): Promise<number> {
  const nodeIds = Array.from(new Set(pairs.map((p) => p.nodeId)));
  const have = new Set<string>();
  for (let i = 0; i < nodeIds.length; i += CHUNK) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc.from("gold_lineage").select("node_id,silver_item_id").in("node_id", nodeIds.slice(i, i + CHUNK)).order("id").range(from, from + 999);
      if (error) throw new Error(`lineage lookup failed: ${error.message}`);
      const page = (data as { node_id: string; silver_item_id: string }[]) || [];
      page.forEach((r) => have.add(`${r.node_id} ${r.silver_item_id}`));
      if (page.length < 1000) break;
    }
  }
  const fresh: Record<string, unknown>[] = [];
  for (const p of pairs) {
    const k = `${p.nodeId} ${p.silverId}`;
    if (have.has(k)) continue;
    have.add(k);
    fresh.push({ node_id: p.nodeId, silver_item_id: p.silverId, promoted_by: promoted.promoted_by, importer: promoted.importer ?? null });
  }
  for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await svc.from("gold_lineage").insert(fresh.slice(i, i + 500));
    if (error) throw new Error(`${promoted.promoted_by} lineage failed: ${error.message}`);
  }
  return fresh.length;
}

async function writeImporterLineage(svc: SupabaseClient, importer: Importer, nodes: IngestNodeDraft[], silverOf: (slug: string) => string | undefined): Promise<number> {
  const ids = new Map<string, string>();
  const slugs = nodes.map((n) => n.slug);
  for (let i = 0; i < slugs.length; i += CHUNK) {
    const { data, error } = await svc.from("nodes").select("id,slug").in("slug", slugs.slice(i, i + CHUNK));
    if (error) throw new Error(`node lookup failed: ${error.message}`);
    ((data as { id: string; slug: string }[]) || []).forEach((r) => ids.set(r.slug, r.id));
  }
  const pairs = nodes.flatMap((n) => {
    const nodeId = ids.get(n.slug);
    const silverId = silverOf(n.slug);
    return nodeId && silverId ? [{ nodeId, silverId }] : [];
  });
  return insertNodeLineage(svc, pairs, { promoted_by: "importer", importer });
}

async function writeShadow(label: string, input: MedallionInput): Promise<void> {
  const svc = graphClient(label);
  const { policy, sha256 } = loadPolicy();
  const plan = planMedallion({
    nodes: input.nodes.map((n) => ({ slug: n.slug, kind: n.kind, branch: n.branch, title: n.title, provenance: n.provenance })),
    io: repoIO,
    policy,
    seedSlugs: seedSlugs(policy),
    parser: SHADOW_PARSER,
    parserRevision: SHADOW_PARSER_REVISION,
  });
  const { candidates, unsilvered } = edgeCandidates(input.factorEdges ?? [], plan.silverBySlug, SHADOW_PARSER, SHADOW_PARSER_REVISION);

  const { data: admitted, error: admitErr } = await svc.rpc("admit_bronze_sources", {
    p_run_revision: runRevision(plan.bronze),
    p_policy_sha256: sha256,
    p_policy_status: policy.status,
    p_rows: plan.bronze.map(admissionRow),
  });
  if (admitErr) throw new Error(`bronze admission failed: ${admitErr.message}`);
  const refused = new Set(((admitted as { refused?: { source_id: string }[] })?.refused ?? []).map((r) => r.source_id));

  const byKey = new Map<string, SilverDraft>();
  for (const s of [...plan.silver, ...candidates.map((c) => c.silver)]) if (!refused.has(s.source_id)) byKey.set(silverKey(s), s);
  const silverRows = Array.from(byKey.values());
  let silverWritten = 0;
  for (let i = 0; i < silverRows.length; i += 500) {
    const { data, error } = await svc.from("silver_items").upsert(silverRows.slice(i, i + 500), { onConflict: SILVER_CONFLICT, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`silver write failed: ${error.message}`);
    silverWritten += ((data as unknown[]) || []).length;
  }
  const needIds = !!input.importer || (input.proposedNodes?.length ?? 0) > 0 || candidates.length > 0;
  const ids = needIds ? await silverIds(svc, silverRows) : new Map<string, string>();
  const idOf = (s: SilverDraft | undefined) => (s && !refused.has(s.source_id) ? ids.get(silverKey(s)) : undefined);

  const lineage = input.importer ? await writeImporterLineage(svc, input.importer, input.nodes, (slug) => idOf(plan.silverBySlug.get(slug))) : 0;

  const nodeRows = (input.proposedNodes ?? []).map((n) => {
    const s = plan.silverBySlug.get(n.slug) ?? null;
    return nodeProposalRow(label, n, s, idOf(s ?? undefined) ?? null);
  });
  for (let i = 0; i < nodeRows.length; i += 200) {
    const { error } = await svc.from("node_proposals").upsert(nodeRows.slice(i, i + 200), { onConflict: "key", ignoreDuplicates: true });
    if (error) throw new Error(`node proposals failed: ${error.message}`);
  }

  const branchOf = new Map(input.nodes.map((n) => [n.slug, n.branch]));
  const queued = candidates.filter((c) => queueable(c.silver));
  const bare = unsilvered.filter((e) => (e.confidence ?? 0) >= HIDE_BELOW);
  const edgeRows = [
    ...queued.map((c) => edgeProposalRow(label, c.edge, idOf(c.silver) ?? null, branchOf.get(factorAndDependent(c.edge).dependent) ?? c.silver.proposal.branch)),
    ...bare.map((e) => edgeProposalRow(label, e, null, branchOf.get(factorAndDependent(e).dependent) ?? "00-unsorted")),
  ];
  const pairs = new Set<string>();
  const uniqueEdgeRows = edgeRows.filter((r) => {
    const k = `${r.from_slug} ${r.to_slug}`;
    if (pairs.has(k)) return false;
    pairs.add(k);
    return true;
  });
  for (let i = 0; i < uniqueEdgeRows.length; i += 500) {
    const { error } = await svc.from("edge_proposals").upsert(uniqueEdgeRows.slice(i, i + 500), { onConflict: "from_slug,to_slug", ignoreDuplicates: true });
    if (error) throw new Error(`edge proposals failed: ${error.message}`);
  }

  const a = { staged: 0, unchanged: 0, superseded: 0, ...((admitted ?? {}) as { staged?: number; unchanged?: number; superseded?: number }) };
  const held = (input.factorEdges?.length ?? 0) - uniqueEdgeRows.length;
  console.log(
    `[${label}] medallion: ${plan.bronze.length} bronze (${a.staged} new, ${a.unchanged} unchanged, ${a.superseded} superseded, ${refused.size} refused), ` +
      `${silverRows.length} silver (${silverWritten} new), ${lineage} importer lineage rows, ${nodeRows.length} node proposals, ` +
      `${uniqueEdgeRows.length} edge proposals, ${held} factor edges held in silver below ${HIDE_BELOW} or duplicate, ` +
      `${input.nodes.length - plan.silverBySlug.size} drafts without silver.`,
  );
}
