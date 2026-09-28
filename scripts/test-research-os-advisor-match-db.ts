import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { sql, TEST_DB as DB } from "./lib/test-harness";

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = sql("select to_regprocedure('graph.advisor_activate(text,int)') is not null");

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
if (REQUIRED && migrated.out !== "t") throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the advisor-match migration is not applied");
const skip = !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the advisor-match migration is not applied";

test("advisor match tables, opt-out, activation, usage cap and account deletion hold in Postgres", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_advisor_match.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, (run.stdout || "") + (run.stderr || ""));
});
