import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const reachable = spawnSync("psql", [DB, "-At", "-c", "select to_regclass('graph.node_grants') is not null"], { encoding: "utf8" });
const ready = reachable.status === 0 && reachable.stdout.trim() === "t";

if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no database carries graph.node_grants");
  process.exit(1);
}

test("graph.nodes visible_select admits a live grantee and refuses the rest", { skip: ready ? false : "no local database with graph.node_grants" }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "graph_nodes_visible_select.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
