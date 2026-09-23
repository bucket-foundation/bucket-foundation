import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { rebuildPrereqAncestorForBranch } from "../src/lib/research-os/rebuild-ancestor";

async function main(): Promise<void> {
  const branch = process.argv[2] || "02-physics";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[rebuild-prereq-ancestor] SUPABASE env not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Nothing written.");
    process.exit(1);
  }
  const svc = createClient(url, serviceKey, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  if (branch === "--all") {
    const branches = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc.from("nodes").select("branch").order("id").range(from, from + 999);
      if (error) throw new Error(`branch query failed: ${error.message}`);
      for (const r of (data as Array<{ branch: string }>) || []) branches.add(r.branch);
      if (!data || data.length < 1000) break;
    }
    let rows = 0;
    for (const b of Array.from(branches).sort()) {
      const r = await rebuildPrereqAncestorForBranch(svc, b);
      rows += r.closureRowCount;
      console.log(`[rebuild-prereq-ancestor] branch "${b}": ${r.nodeCount} nodes, ${r.closureRowCount} closure rows.`);
    }
    console.log(`[rebuild-prereq-ancestor] ${branches.size} branches, ${rows} closure rows written.`);
    return;
  }

  const result = await rebuildPrereqAncestorForBranch(svc, branch);
  if (result.nodeCount === 0) {
    console.log(`[rebuild-prereq-ancestor] no nodes for branch "${result.branch}", nothing to do.`);
    return;
  }
  console.log(
    `[rebuild-prereq-ancestor] branch "${result.branch}": ${result.nodeCount} nodes, ${result.edgeCount} prerequisite edges, ${result.closureRowCount} closure rows.`,
  );
  if (result.closureRowCount === 0) {
    console.log("[rebuild-prereq-ancestor] closure is empty (every node is a root); table left empty for this branch.");
    return;
  }
  console.log(`[rebuild-prereq-ancestor] wrote ${result.closureRowCount} rows to graph.prereq_ancestor.`);
}

main().catch((err) => {
  console.error("[rebuild-prereq-ancestor] FAILED:", err.message);
  process.exit(1);
});
