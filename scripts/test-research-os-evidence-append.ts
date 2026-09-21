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
import fs from "node:fs";

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

/** The local stack's keys live in .env.local, which ts-node does not read. */
function loadLocalEnv(): void {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadLocalEnv();

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

  // A shared start time is a rendezvous two processes can keep, where a
  // fixed sleep only overlaps when both shells start together.
  const startAt = new Date(Date.now() + 1200).toISOString();
  const appendAtStart = (kind: string) => sqlAsync(`
    begin;
    select pg_sleep_until('${startAt}'::timestamptz);
    select graph.append_evidence('${learner}', '${node}', 'awareness', '{"kind":"${kind}"}'::jsonb);
    commit;
  `);

  const [a, b] = await Promise.all([appendAtStart("first"), appendAtStart("second")]);
  assert.equal(a.status, 0, a.out);
  assert.equal(b.status, 0, b.out);

  const count = sql(`select jsonb_array_length(evidence) from graph.learner_node_state
                     where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(count.out, "2", `both appends survive the race on a new row, got ${count.out}`);

  const kinds = sql(`select string_agg(e->>'kind', ',' order by e->>'kind')
                     from graph.learner_node_state, jsonb_array_elements(evidence) e
                     where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(kinds.out, "first,second", `both events are readable, got ${kinds.out}`);

  // The control: the read-modify-write shape this RPC replaces, on the same
  // new row and the same rendezvous, keeps one event. A fixture that cannot
  // see that cannot prove the RPC fixed anything.
  sql(`delete from graph.learner_node_state where learner_id = '${learner}' and node_id = '${node}'`);
  const controlAt = new Date(Date.now() + 1200).toISOString();
  const readModifyWrite = (kind: string) => sqlAsync(`
    do $$
    declare v jsonb;
    begin
      perform pg_sleep_until('${controlAt}'::timestamptz);
      select evidence into v from graph.learner_node_state
        where learner_id = '${learner}' and node_id = '${node}';
      insert into graph.learner_node_state (learner_id, node_id, stage, evidence)
      values ('${learner}', '${node}', 'awareness', coalesce(v, '[]'::jsonb) || jsonb_build_array('{"kind":"${kind}"}'::jsonb))
      on conflict (learner_id, node_id) do update
        set evidence = coalesce(v, '[]'::jsonb) || jsonb_build_array('{"kind":"${kind}"}'::jsonb);
    end $$;
  `);
  const [c, d] = await Promise.all([readModifyWrite("third"), readModifyWrite("fourth")]);
  assert.equal(c.status, 0, c.out);
  assert.equal(d.status, 0, d.out);
  const lost = sql(`select jsonb_array_length(evidence) from graph.learner_node_state
                    where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(lost.out, "1", `the replaced shape loses an event on the same path, got ${lost.out}`);
});

test("a teacher override lowers the stage through overrideLevel", { skip }, async (t) => {
  const learner = randomUUID();
  const teacher = randomUUID();
  const node = randomUUID();
  const klass = randomUUID();

  const made = sql(`
    insert into auth.users (id, instance_id, aud, role, email) values
      ('${learner}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'override-learner-${learner}@bucket.test'),
      ('${teacher}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'override-teacher-${teacher}@bucket.test');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      values ('${node}', 'override-fixture-${node}', 'Override fixture', 'concept', 10, '01-mathematics', 'fixture');
    insert into graph.classes (id, name, reviewer_email, created_by)
      values ('${klass}', 'Override fixture class', 'override-teacher-${teacher}@bucket.test', '${teacher}');
    insert into graph.class_members (class_id, learner_id, role) values ('${klass}', '${learner}', 'learner');
    select graph.append_evidence('${learner}', '${node}', 'production', '{"kind":"production_submitted"}'::jsonb);
  `);
  assert.equal(made.status, 0, made.out);

  t.after(() => {
    sql(`delete from graph.level_overrides where learner_id = '${learner}';
         delete from graph.learner_node_state where learner_id = '${learner}';
         delete from graph.class_members where class_id = '${klass}';
         delete from graph.classes where id = '${klass}';
         delete from graph.nodes where id = '${node}';
         delete from auth.users where id in ('${learner}', '${teacher}');`);
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { overrideLevel } = require("../src/lib/research-os/class-db") as typeof import("../src/lib/research-os/class-db");
  const result = await overrideLevel(
    { id: teacher, email: `override-teacher-${teacher}@bucket.test`, roles: ["teacher"] },
    klass,
    learner,
    node,
    "awareness",
    "the production was returned for revision",
  );
  assert.equal(result.ok, true, JSON.stringify(result));

  const stage = sql(`select stage from graph.learner_node_state
                     where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(stage.out, "awareness", `the override lands on the state row, got ${stage.out}`);

  const audit = sql(`select from_stage || ' -> ' || to_stage from graph.level_overrides
                     where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(audit.out, "production -> awareness", `the audit row records what was written, got ${audit.out}`);

  const events = sql(`select count(*) from graph.learner_node_state, jsonb_array_elements(evidence) e
                      where learner_id = '${learner}' and node_id = '${node}' and e->>'kind' = 'override'`);
  assert.equal(events.out, "1", `the override appends one evidence event, got ${events.out}`);
});

// The function is the only way to write that row, and nothing in Postgres
// enforces it, so this keeps the invariant the RPC depends on visible: one
// writer in the application, and the tests that build fixtures.
test("recordEvidence is the only application writer of learner_node_state", () => {
  const roots = [path.join(__dirname, "..", "src")];
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        const writes = /from\(\s*["']learner_node_state["']\s*\)[\s\S]{0,200}?\.(upsert|update|insert|delete)\(/g;
        if (writes.test(text)) offenders.push(path.relative(path.join(__dirname, ".."), full));
      }
    }
  };
  roots.forEach(walk);
  assert.deepEqual(
    offenders,
    [],
    `these write learner_node_state outside graph.append_evidence: ${offenders.join(", ")}`,
  );
});
