import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { checkRepoPath } from "../src/lib/research-os/medallion/paths";
import { sql, TEST_DB as DB } from "./lib/test-harness";

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = sql("select to_regprocedure('graph.admit_bronze_sources(text,text,text,jsonb)') is not null");

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
if (REQUIRED && migrated.out !== "t") throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the medallion migration is not applied");
const skip = !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the medallion migration is not applied";

test("the medallion contract holds in real Postgres", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_medallion.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, (run.stdout || "") + (run.stderr || ""));
});

test("the path CHECK and checkRepoPath agree", { skip }, () => {
  const cases = [
    "_intake/concept-digests/a.md",
    "bucket-canon/02-physics/sub-claims/x/",
    "src/data/canon-sites.json",
    "/home/gian/agfarms/_intake/a.md",
    "~/a.md",
    "_intake/../x",
    "_intake/./x",
    "_intake//x",
    "_intake\\x",
    "src/app/page.tsx",
    ".env.local",
  ];
  for (const p of cases) {
    const literal = p.replace(/'/g, "''");
    const run = sql(
      `begin; set local session_replication_role = replica; insert into graph.bronze_file_paths (source_id, source_revision, repo_path) values ('file:${"0".repeat(64)}', '${"0".repeat(64)}', E'${literal.replace(/\\/g, "\\\\")}'); rollback;`,
    );
    const sqlAccepts = run.status === 0;
    assert.equal(sqlAccepts, checkRepoPath(p).ok, `${p}: sql ${sqlAccepts ? "accepts" : `refuses (${run.out})`}`);
  }
});

test("each medallion function has one signature", { skip }, () => {
  for (const fn of ["admit_bronze_sources", "admit_evidence_corpus", "eligible_evidence_sources", "gold_lineage_rules", "silver_items_rights", "medallion_withdrawal_cascade"]) {
    const n = sql(`select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'graph' and p.proname = '${fn}'`);
    assert.equal(n.out, "1", `${fn}: ${n.out}`);
  }
});
