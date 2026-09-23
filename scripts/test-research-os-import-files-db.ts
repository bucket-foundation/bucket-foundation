/**
 * ros-import 1's table in real Postgres: the generated path, the checks,
 * the one-row-per-bytes index, the immutability trigger, and the bucket
 * with no update policy on it.
 * supabase/tests/research_os_import_files.sql runs in one transaction
 * that rolls back. Needs the local stack; with no database reachable the
 * test is skipped and says so.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const reachable = spawnSync("psql", [DB, "-At", "-c", "select to_regclass('graph.import_files') is not null"], { encoding: "utf8" });
const ready = reachable.status === 0 && reachable.stdout.trim() === "t";

// The CI step sets RESEARCH_OS_REQUIRE_DB and this script ignored it, so
// the database half skipped green on a runner with no migration applied
// and could never fail. The sibling evidence-admissions runner has read
// it all along.
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no database carries the ros-import 1 migration");
  process.exit(1);
}

test("the import file table holds in real Postgres", { skip: ready ? false : "no local database with the ros-import 1 migration" }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_import_files.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
