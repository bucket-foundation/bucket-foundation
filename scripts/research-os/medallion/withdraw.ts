import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isReviewerEmail } from "../../../src/lib/research-os/reviewer";
import { parseWithdrawArgs, withdrawalImpact } from "../../../src/lib/research-os/medallion/withdrawal";

const CHUNK = 40;

type Row = Record<string, unknown>;

async function pages<T>(run: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await run(from, from + 999);
    if (error) throw new Error(`${what}: ${error.message}`);
    const page = (data as T[]) || [];
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

async function chunked<T>(values: string[], run: (chunk: string[], from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += CHUNK) out.push(...(await pages<T>((from, to) => run(values.slice(i, i + CHUNK), from, to), what)));
  return out;
}

async function sourcesFor(svc: SupabaseClient, target: { source: string } | { path: string }): Promise<string[]> {
  if ("source" in target) return [target.source];
  const rows = await pages<{ source_id: string }>(
    (from, to) => svc.from("bronze_file_paths").select("source_id,source_revision").eq("repo_path", target.path).order("source_id").order("source_revision").range(from, to),
    "path lookup",
  );
  return Array.from(new Set(rows.map((r) => r.source_id))).sort();
}

async function reviewerId(svc: SupabaseClient, email: string): Promise<string | null> {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page < 100; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`reviewer lookup: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === wanted);
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function main() {
  const parsed = parseWithdrawArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`[withdraw] ${parsed.error}. Use --source=file:<sha256> or --path=<repo path> with --reason=<text>, --queue, or --restore=<slug> --reviewer=<email>.`);
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[withdraw] needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const args = parsed.args;

  if (args.mode === "queue") {
    const rows = await pages<{ node_id: string; source_id: string; withdrawn_at: string }>(
      (from, to) => svc.from("medallion_withdrawn_nodes").select("node_id,source_id,withdrawn_at").is("reviewed_at", null).order("withdrawn_at").order("node_id").range(from, to),
      "queue",
    );
    const slugs = new Map(
      (await chunked<{ id: string; slug: string }>(rows.map((r) => r.node_id), (c, from, to) => svc.from("nodes").select("id,slug").in("id", c).order("id").range(from, to), "nodes")).map((n) => [n.id, n.slug]),
    );
    console.log(`[withdraw] ${rows.length} withdrawn node(s) wait for a reviewer.`);
    for (const r of rows) console.log(`  ${slugs.get(r.node_id) ?? r.node_id}\t${r.source_id}\t${r.withdrawn_at}`);
    return;
  }

  if (args.mode === "restore") {
    if (!isReviewerEmail(args.reviewer)) {
      console.error("[withdraw] --reviewer is not on RESEARCH_OS_REVIEWER_EMAILS.");
      process.exit(1);
    }
    const { data: node, error } = await svc.from("nodes").select("id,slug").eq("slug", args.slug).maybeSingle();
    if (error) throw new Error(`node lookup: ${error.message}`);
    if (!node) {
      console.error(`[withdraw] no node ${args.slug}.`);
      process.exit(1);
    }
    if (!args.apply) {
      console.log(`[withdraw] would restore ${args.slug} if its source is active again. Dry run, nothing written.`);
      return;
    }
    const id = await reviewerId(svc, args.reviewer);
    if (!id) {
      console.error("[withdraw] the reviewer has no account.");
      process.exit(1);
    }
    const { data: res, error: rpcErr } = await svc.rpc("restore_withdrawn_node", { p_node: (node as { id: string }).id, p_reviewer: id });
    if (rpcErr) throw new Error(`restore: ${rpcErr.message}`);
    const out = res as { ok: boolean; error?: string; visibility?: string };
    if (!out.ok) {
      console.error(`[withdraw] ${args.slug} not restored: ${out.error}.`);
      process.exit(1);
    }
    console.log(`[withdraw] restored ${args.slug} to ${out.visibility}.`);
    return;
  }

  const sourceIds = await sourcesFor(svc, args.target);
  if (!sourceIds.length) {
    console.error("[withdraw] no bronze source matches.");
    process.exit(1);
  }
  const admissions = await chunked<{ source_id: string; status: string }>(
    sourceIds,
    (c, from, to) => svc.from("evidence_source_admissions").select("source_id,source_revision,status").in("source_id", c).order("source_id").order("source_revision").range(from, to),
    "admissions",
  );
  const silver = await chunked<{ id: string; source_id: string; status: string }>(
    sourceIds,
    (c, from, to) => svc.from("silver_items").select("id,source_id,status").in("source_id", c).order("id").range(from, to),
    "silver",
  );
  const lineageHit = await chunked<{ node_id: string | null; silver_item_id: string }>(
    silver.map((s) => s.id),
    (c, from, to) => svc.from("gold_lineage").select("id,node_id,silver_item_id").in("silver_item_id", c).order("id").range(from, to),
    "lineage",
  );
  const nodeIds = Array.from(new Set(lineageHit.map((l) => l.node_id).filter((v): v is string => !!v)));
  const lineage = await chunked<{ node_id: string; silver_item_id: string }>(
    nodeIds,
    (c, from, to) => svc.from("gold_lineage").select("id,node_id,silver_item_id").in("node_id", c).order("id").range(from, to),
    "node lineage",
  );
  const others = Array.from(new Set(lineage.map((l) => l.silver_item_id).filter((id) => !silver.some((s) => s.id === id))));
  const otherRows = await chunked<{ id: string; source_id: string; status: string }>(
    others,
    (c, from, to) => svc.from("silver_items").select("id,source_id,status").in("id", c).order("id").range(from, to),
    "other silver",
  );
  const impact = withdrawalImpact({
    sourceIds: new Set(sourceIds),
    silver,
    lineage,
    otherSilverStatus: new Map(otherRows.map((r) => [r.id, { source_id: r.source_id, status: r.status }])),
  });
  const slugs = new Map(
    (await chunked<{ id: string; slug: string }>(nodeIds, (c, from, to) => svc.from("nodes").select("id,slug").in("id", c).order("id").range(from, to), "nodes")).map((n) => [n.id, n.slug]),
  );

  console.log(`[withdraw] ${sourceIds.length} source(s): ${sourceIds.join(", ")}`);
  for (const a of admissions) console.log(`  ${a.source_id}\t${a.status}`);
  console.log(`[withdraw] ${impact.silverToWithdraw.length} silver item(s) go withdrawn; ${impact.orphaned.length} gold node(s) go private; ${impact.kept.length} keep another source.`);
  for (const id of impact.orphaned) console.log(`  private\t${slugs.get(id) ?? id}`);
  for (const id of impact.kept) console.log(`  kept\t${slugs.get(id) ?? id}`);
  if (!args.apply) {
    console.log("[withdraw] dry run, nothing written.");
    return;
  }
  let rows = 0;
  for (const id of sourceIds) {
    const { data, error } = await svc.rpc("withdraw_evidence_source", { p_source_id: id, p_reason: args.reason });
    if (error) throw new Error(`withdraw ${id}: ${error.message}`);
    rows += Number(data ?? 0) as number;
  }
  console.log(`[withdraw] withdrew ${rows} admission row(s); nodes left with no live source are private and queued for review.`);
}

main().catch((err: unknown) => {
  const e = err as Row;
  console.error("[withdraw] FAILED:", err instanceof Error ? err.message : String(e));
  process.exit(1);
});
