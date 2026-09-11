/**
 * Research OS for K-12, prereq_ancestor closure table rebuild CLI (bkt-ros,
 * Phase 1 item 1: "migration plus a maintenance function or script that
 * rebuilds it from edges"). Thin wrapper around
 * src/lib/research-os/rebuild-ancestor.ts's `rebuildPrereqAncestorForBranch`
 * (bkt-ros ros-13, factored out so the same rebuild also runs in-process
 * from the /research-os/edges review route's approve action, task item 4)
 * -- this file owns only the CLI's own env-var read and console reporting.
 *
 * Requires the same server-only env vars as scripts/seed-research-os.mjs:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/rebuild-prereq-ancestor.ts [branch]
 *   (branch defaults to "02-physics", the only seeded branch in Phase 0)
 */
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
  // Generics erased back to the default SupabaseClient shape, matching
  // src/lib/research-os/db.ts's graphService() (same header note there):
  // createClient narrows its type from `db.schema: "graph"` to a schema
  // name outside the untyped Database generic, which otherwise cannot
  // unify with rebuildPrereqAncestorForBranch's plain SupabaseClient
  // parameter; table/column names below are plain strings either way.
  const svc = createClient(url, serviceKey, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

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
