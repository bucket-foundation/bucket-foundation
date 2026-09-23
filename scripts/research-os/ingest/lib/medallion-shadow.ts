import { createClient } from "@supabase/supabase-js";
import type { IngestNodeDraft } from "../../../../src/lib/research-os/ingest/types";
import { admissionRow, runRevision } from "../../../../src/lib/research-os/medallion/bronze";
import { planMedallion } from "../../../../src/lib/research-os/medallion/plan";
import { loadPolicy, repoIO, seedSlugs } from "../../medallion/lib/repo-io";

export const SHADOW_FLAG = "--medallion";
export const SHADOW_PARSER = "shadow";
export const SHADOW_PARSER_REVISION = "shadow/1";

export function shadowRequested(argv: string[] = process.argv): boolean {
  return argv.includes(SHADOW_FLAG);
}

export async function shadowWrite(label: string, nodes: IngestNodeDraft[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(`[${label}] ${SHADOW_FLAG} needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Nothing written.`);
    process.exit(1);
  }
  const { policy, sha256 } = loadPolicy();
  const plan = planMedallion({
    nodes: nodes.map((n) => ({ slug: n.slug, kind: n.kind, branch: n.branch, title: n.title, provenance: n.provenance })),
    io: repoIO,
    policy,
    seedSlugs: seedSlugs(policy),
    parser: SHADOW_PARSER,
    parserRevision: SHADOW_PARSER_REVISION,
  });
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } });
  const { data: admitted, error: admitErr } = await svc.rpc("admit_bronze_sources", {
    p_run_revision: runRevision(plan.bronze),
    p_policy_sha256: sha256,
    p_policy_status: policy.status,
    p_rows: plan.bronze.map(admissionRow),
  });
  if (admitErr) throw new Error(`bronze admission failed: ${admitErr.message}`);
  const refused = new Set(((admitted as { refused?: { source_id: string }[] })?.refused ?? []).map((r) => r.source_id));
  const silverRows = plan.silver.filter((s) => !refused.has(s.source_id));
  let silverWritten = 0;
  for (let i = 0; i < silverRows.length; i += 500) {
    const { data, error } = await svc
      .from("silver_items")
      .upsert(silverRows.slice(i, i + 500), { onConflict: "source_id,source_revision,parser,parser_revision,kind,span_start,span_end", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`silver write failed: ${error.message}`);
    silverWritten += ((data as unknown[]) || []).length;
  }
  const a = admitted as { staged: number; activated: number; unchanged: number; superseded: number };
  console.log(
    `[${label}] medallion shadow: ${plan.bronze.length} bronze (${a.staged} new, ${a.unchanged} unchanged, ${a.superseded} superseded, ${refused.size} refused), ` +
      `${silverRows.length} silver (${silverWritten} new), ${nodes.length - plan.silverBySlug.size} gold drafts without silver ` +
      `(${plan.unknown.length} unknown, ${plan.uploads.length} uploads). Gold writes unchanged.`,
  );
}
