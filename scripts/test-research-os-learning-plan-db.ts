import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { loadLocalEnv, TEST_DB as DB } from "./lib/test-harness";
import { dbPlanStore, loadPlan } from "../src/lib/research-os/learning-plan-db";

loadLocalEnv();

const probe = spawnSync("psql", [DB, "-At", "-c", "select count(*) from graph.nodes where provenance->>'type' = 'academy_atom'"], { encoding: "utf8" });
const atoms = probe.status === 0 ? Number(probe.stdout.trim()) : 0;
const keyed = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !(probe.status === 0 && keyed)) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no local database with a Supabase URL and service key");
  process.exit(1);
}
const skip = probe.status === 0 && keyed ? (atoms > 0 ? false : "no Academy atoms imported; run npm run ingest:research-os:academy -- --apply") : "no local stack with a Supabase URL and service key";

test("every Academy atom gets a ready study path that ends at the atom", { skip, timeout: 600000 }, async () => {
  const slugs = spawnSync("psql", [DB, "-At", "-c", "select slug from graph.nodes where provenance->>'type' = 'academy_atom' order by slug"], { encoding: "utf8" }).stdout.trim().split("\n");
  assert.equal(slugs.length, atoms);
  const failures: string[] = [];
  for (const slug of slugs) {
    const r = await loadPlan(dbPlanStore, slug, null);
    if (r.status !== "plan" || r.plan.status !== "ready") {
      failures.push(`${slug}: ${r.status === "plan" ? r.plan.status : r.status}`);
      continue;
    }
    const last = r.plan.studyOrder[r.plan.studyOrder.length - 1];
    if (r.nodes[last]?.slug !== slug) failures.push(`${slug}: ends at ${r.nodes[last]?.slug}`);
  }
  assert.deepEqual(failures, []);
});
