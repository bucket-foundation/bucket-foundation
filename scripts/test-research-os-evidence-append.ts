/**
 * graph.append_evidence against real Postgres: the contract file in one
 * rolled-back transaction, and two concurrent writers on one learner-node
 * row (ros-ai-access, learning/research-os/ai/IMPLEMENTATION.md, "Quote
 * contract").
 *
 * The concurrency case carries its own control: the read-modify-write shape
 * the RPC replaces loses an event under the same timing, so a fixture that
 * cannot see the bug fails here rather than passing quietly.
 *
 * Needs the local stack with this migration applied; with no database the
 * tests skip and say so.
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

function sqlAsync(statement: string): Promise<{ status: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement]);
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (out += d.toString()));
    child.on("close", (code: number | null) => resolve({ status: code ?? 1, out: out.trim() }));
  });
}

const probe = sql("select to_regprocedure('graph.append_evidence(uuid,uuid,text,jsonb,boolean)') is not null");
const ready = probe.status === 0 && probe.out === "t";
const skip = ready ? false : "no local database with the evidence-append migration";

test("the append contract holds in real Postgres", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_evidence_append.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("two writers racing on one row keep both events", { skip }, async (t) => {
  const learner = randomUUID();
  const node = randomUUID();
  const email = `append-race-${learner}@bucket.test`;
  const slug = `append-race-${node}`;

  const made = sql(`
    insert into auth.users (id, instance_id, aud, role, email)
      values ('${learner}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${email}');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      values ('${node}', '${slug}', 'Append race fixture', 'concept', 10, '01-mathematics', 'fixture');
    select 'made';
  `);
  assert.equal(made.status, 0, made.out);

  t.after(() => {
    sql(`delete from graph.learner_node_state where learner_id = '${learner}';
         delete from graph.nodes where id = '${node}';
         delete from auth.users where id = '${learner}';`);
  });

  const appendAfterPause = (kind: string) => sqlAsync(`
    begin;
    select pg_sleep(0.25);
    select graph.append_evidence('${learner}', '${node}', 'awareness', '{"kind":"${kind}"}'::jsonb);
    commit;
  `);

  const [a, b] = await Promise.all([appendAfterPause("first"), appendAfterPause("second")]);
  assert.equal(a.status, 0, a.out);
  assert.equal(b.status, 0, b.out);

  const count = sql(`select jsonb_array_length(evidence) from graph.learner_node_state
                     where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(count.out, "2", `both appends survive the race, got ${count.out}`);

  const kinds = sql(`select string_agg(e->>'kind', ',' order by e->>'kind')
                     from graph.learner_node_state, jsonb_array_elements(evidence) e
                     where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(kinds.out, "first,second", `both events are readable, got ${kinds.out}`);

  // The control: the read-modify-write shape this RPC replaces, under the
  // same timing, keeps one event. A fixture that cannot see that cannot
  // prove the RPC fixed anything.
  sql(`update graph.learner_node_state set evidence = '[]'::jsonb
       where learner_id = '${learner}' and node_id = '${node}'`);
  const readModifyWrite = (kind: string) => sqlAsync(`
    do $$
    declare v jsonb;
    begin
      select evidence into v from graph.learner_node_state
        where learner_id = '${learner}' and node_id = '${node}';
      perform pg_sleep(0.25);
      update graph.learner_node_state
         set evidence = v || jsonb_build_array('{"kind":"${kind}"}'::jsonb)
       where learner_id = '${learner}' and node_id = '${node}';
    end $$;
  `);
  const [c, d] = await Promise.all([readModifyWrite("third"), readModifyWrite("fourth")]);
  assert.equal(c.status, 0, c.out);
  assert.equal(d.status, 0, d.out);
  const lost = sql(`select jsonb_array_length(evidence) from graph.learner_node_state
                    where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(lost.out, "1", `the replaced shape loses an event, got ${lost.out}`);
});
