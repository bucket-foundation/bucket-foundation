import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const reachable = spawnSync("psql", [DB, "-At", "-c", "select to_regprocedure('graph.merge_edge_proposals(jsonb)') is not null"], { encoding: "utf8" });
const ready = reachable.status === 0 && reachable.stdout.trim() === "t";

test("review functions hold in real Postgres", { skip: ready ? false : "no local database with the ros-prime 2 migrations" }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_proposals.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
