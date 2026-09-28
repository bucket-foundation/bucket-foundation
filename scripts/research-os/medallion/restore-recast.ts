import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const PROPOSAL = process.argv.find((a) => a.startsWith("--proposal="))?.slice("--proposal=".length) ?? null;

async function main() {
  if (!ALL && !PROPOSAL) {
    console.error("[restore-recast] pass --proposal=<id> or --all.");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  let q = svc.from("edge_proposals").select("id,from_slug,to_slug").eq("action", "demote").eq("status", "rejected").eq("decided_kind", "cites");
  if (PROPOSAL) q = q.eq("id", PROPOSAL);
  const { data, error } = await q;
  if (error) throw new Error(`proposal lookup failed: ${error.message}`);
  const rows = (data as { id: string; from_slug: string; to_slug: string }[]) || [];
  console.log(`[restore-recast] ${rows.length} recast edge(s) to restore.`);
  if (!APPLY) {
    rows.forEach((r) => console.log(`  ${r.to_slug} -> ${r.from_slug}`));
    console.log("[restore-recast] dry run, nothing written.");
    return;
  }
  let restored = 0;
  for (const r of rows) {
    const { data: res, error: rpcErr } = await svc.rpc("restore_recast_edge", { p_proposal: r.id });
    if (rpcErr) throw new Error(`restore failed for ${r.id}: ${rpcErr.message}`);
    if ((res as { ok?: boolean }).ok) restored++;
    else console.error(`[restore-recast] ${r.id}: ${(res as { error?: string }).error}`);
  }
  console.log(`[restore-recast] restored ${restored} of ${rows.length}; each proposal is pending again.`);
}

main().catch((err) => {
  console.error("[restore-recast] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
