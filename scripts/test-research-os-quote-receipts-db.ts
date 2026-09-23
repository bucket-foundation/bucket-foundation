import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sql, TEST_DB as DB } from "./lib/test-harness";

const SIGNATURE = "graph.record_quote_receipt(uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,jsonb)";

function sqlAsync(statement: string): Promise<{ status: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement]);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (status) => resolve({ status: status ?? 1, out: out.trim() }));
  });
}

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = sql(`select to_regprocedure('${SIGNATURE}') is not null`);

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
}
if (REQUIRED && migrated.out !== "t") {
  throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the quote-receipts migration is not applied");
}
const skip = !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the quote-receipts migration is not applied";

test("the receipt contract holds in real Postgres", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_quote_receipts.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, (run.stdout || "") + (run.stderr || ""));
});

test("a quotation of a source the registry has not admitted is refused", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_quote_admission.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, (run.stdout || "") + (run.stderr || ""));
});

test("the migration leaves exactly one privacy_delete_learner", { skip }, () => {
  const overloads = sql(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'graph' and p.proname = 'privacy_delete_learner'`);
  assert.equal(overloads.out, "1", `one signature, found: ${overloads.out}`);
  const args = sql(`select pg_get_function_identity_arguments(p.oid) from pg_proc p
                    join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'graph' and p.proname = 'privacy_delete_learner'`);
  assert.match(args.out, /p_learner_id uuid, p_actor_id uuid, p_acting_as_reviewer boolean/, "and it is the canonical one");
});

test("the privacy delete can call digest, on a database that keeps pgcrypto elsewhere", { skip }, () => {
  const config = sql(`select array_to_string(p.proconfig, ' ') from pg_proc p
                      join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'graph' and p.proname = 'privacy_delete_learner'`);
  assert.match(config.out, /search_path=.*extensions/, `the search_path carries extensions: ${config.out}`);
});

test("two requests racing on one idempotency key write one receipt", { skip }, async (t) => {
  const learner = randomUUID();
  const node = randomUUID();
  const key = `race-${randomUUID()}`;
  const REV = "f".repeat(64);
  t.after(() => {
    sql(`delete from graph.source_quote_receipts where learner_id = '${learner}';
         delete from graph.evidence_source_admissions where source_id = 'graph:${node}';
         delete from graph.learner_node_state where learner_id = '${learner}';
         delete from graph.nodes where id = '${node}';
         delete from auth.users where id = '${learner}';`);
  });

  const made = sql(`
    insert into auth.users (id, instance_id, aud, role, email)
      values ('${learner}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-race-${learner}@bucket.test');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      values ('${node}', 'quote-race-${node}', 'Quote race fixture', 'concept', 10, '01-mathematics', 'fixture');
    insert into graph.evidence_source_admissions (source_id, source_revision, scope, node_id, body_hash, original_hash,
      extraction_revision, corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status,
      allow_index, allow_quote, status)
      values ('graph:${node}', '${REV}', 'quote', '${node}', '${REV}', '${REV}', 'curated-passage/1 nfc-lf/1', '${REV}',
        'fixture', 1, '${REV}', 'draft', false, true, 'active');
    select 'made';`);
  assert.equal(made.status, 0, made.out);

  const call = `select graph.record_quote_receipt(
    '${learner}', '${node}', 'graph:${node}', '${REV}', '${node}', 'graph:${node}#p1', 'p. 1',
    'hash-race', 'session-race', '${key}', 'payload-race', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb)`;

  const [a, b] = await Promise.all([sqlAsync(call), sqlAsync(call)]);
  assert.equal(a.status, 0, `the first call succeeded: ${a.out}`);
  assert.equal(b.status, 0, `and so did the one that raced it: ${b.out}`);

  const rows = sql(`select count(*) from graph.source_quote_receipts where learner_id = '${learner}' and idempotency_key = '${key}'`);
  assert.equal(rows.out, "1", "one receipt, whichever call won");

  const receiptId = sql(`select id from graph.source_quote_receipts where learner_id = '${learner}' and idempotency_key = '${key}'`).out;
  for (const answer of [a.out, b.out]) {
    assert.ok(answer.includes(receiptId), `both callers were told the same receipt id: ${answer}`);
  }
  const replayed = [a.out, b.out].filter((o) => /"replayed": true/.test(o)).length;
  assert.equal(replayed, 1, "exactly one of the two is reported as a replay");

  const events = sql(`select jsonb_array_length(evidence) from graph.learner_node_state where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(events.out, "1", "and the quotation was logged once, not twice");
});
