import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const MIGRATION = path.join(__dirname, "..", "supabase", "migrations", "20260924090000_public_legacy_tables_deny.sql");
const FIXTURE = path.join(__dirname, "..", "supabase", "tests", "public_legacy_tables_deny.sql");
const reachable = spawnSync("psql", [DB, "-At", "-c", "select exists (select 1 from pg_roles where rolname = 'anon')"], { encoding: "utf8" });
const ready = reachable.status === 0 && reachable.stdout.trim() === "t";

if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no Supabase database is reachable");
  process.exit(1);
}

function psql(args: string[]) {
  return spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8" });
}

test("the deny migration applies twice on a database without the legacy tables", { skip: ready ? false : "no local Supabase database" }, () => {
  const absent = spawnSync("psql", [DB, "-At", "-c", "select count(*) from unnest(array['author','cite_tokens','ip_metadata','research','research_cite']) t where to_regclass('public.' || t) is not null"], { encoding: "utf8" });
  assert.equal(absent.stdout.trim(), "0", "this check needs a database that never carried the legacy tables");
  const run = psql(["-c", "begin", "-f", MIGRATION, "-f", MIGRATION, "-c", "rollback"]);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("the deny migration locks the legacy tables against anon and authenticated", { skip: ready ? false : "no local Supabase database" }, () => {
  const run = psql(["-f", FIXTURE]);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
