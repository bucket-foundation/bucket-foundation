/**
 * graph.evidence_source_admissions against real Postgres (ros-ai-corpus,
 * the admission registry). The contract file
 * supabase/tests/research_os_evidence_admissions.sql runs in one
 * rolled-back transaction; the lock race below needs two connections, so
 * it lives here and cleans up after itself. Nothing here calls
 * admit_evidence_corpus outside a transaction that rolls back, because an
 * admission replaces the active set.
 *
 * With no database the tests skip and say so. RESEARCH_OS_REQUIRE_DB=1
 * turns that skip into a failure, which is how the database job in CI
 * proves these ran.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function sql(statement: string): { status: number; out: string } {
  const run = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
  return { status: run.status ?? 1, out: (run.stdout || "").trim() + (run.stderr || "") };
}

function sqlAsync(statement: string): Promise<{ status: number; out: string; ms: number }> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn("psql", [DB, "-Atq", "-v", "ON_ERROR_STOP=1", "-c", statement]);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (status) => resolve({ status: status ?? 1, out: out.trim(), ms: Date.now() - started }));
  });
}

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = sql("select to_regprocedure('graph.admit_evidence_corpus(text,text,text,jsonb)') is not null");

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
if (REQUIRED && migrated.out !== "t") throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the evidence-admissions migration is not applied");
const skip = !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the evidence-admissions migration is not applied";

test("the admission contract holds in real Postgres", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_evidence_admissions.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, (run.stdout || "") + (run.stderr || ""));
});

test("each admission function has one signature", { skip }, () => {
  for (const fn of ["admit_evidence_corpus", "withdraw_evidence_source", "quote_admission", "eligible_evidence_sources"]) {
    const n = sql(`select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'graph' and p.proname = '${fn}'`);
    assert.equal(n.out, "1", `${fn}: ${n.out}`);
  }
});

test("a withdrawal waits for a Quote transaction holding the admission, then lands", { skip }, async () => {
  const source = `graph:${randomUUID()}`;
  const revision = randomUUID().replace(/-/g, "").padEnd(64, "0");
  const h = "a".repeat(64);
  // The superuser writes the fixture row directly: the service role cannot,
  // and admit_evidence_corpus would replace the active set.
  const seeded = sql(`insert into graph.evidence_source_admissions (source_id, source_revision, scope, body_hash, original_hash,
      extraction_revision, corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status,
      allow_index, allow_quote, status, activated_at)
    values ('${source}', '${revision}', 'quote', '${h}', '${h}', 'test', '${h}', 'test', 1, '${h}', 'draft', false, true, 'active', now())`);
  assert.equal(seeded.status, 0, seeded.out);
  try {
    const quote = sqlAsync(`begin; select allowed from graph.quote_admission('${source}', '${revision}'); select pg_sleep(1.5); commit;`);
    await new Promise((r) => setTimeout(r, 300));
    const withdrawal = sqlAsync(`select graph.withdraw_evidence_source('${source}', 'lock test')`);
    const [q, w] = await Promise.all([quote, withdrawal]);
    assert.equal(q.status, 0, q.out);
    assert.match(q.out, /^t/, "the Quote transaction read the admission as allowed");
    assert.equal(w.status, 0, w.out);
    assert.equal(w.out, "1");
    assert.ok(w.ms >= 900, `the withdrawal returned after ${w.ms} ms, before the Quote transaction released its lock`);
    const after = sql(`select allowed || ' ' || status from graph.quote_admission('${source}', '${revision}')`);
    assert.equal(after.out, "false withdrawn");
  } finally {
    sql(`delete from graph.evidence_source_admissions where source_id = '${source}'`);
  }
});
