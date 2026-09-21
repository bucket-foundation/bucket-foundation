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

// The connection is what these tests need. Probing for the function would
// skip the fresh-apply replay on exactly the database it exists to cover.
const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = sql("select to_regprocedure('graph.append_evidence(uuid,uuid,text,jsonb,boolean)') is not null");

// A skipped test reads as a pass. RESEARCH_OS_REQUIRE_DB=1 turns the skip
// into a failure, which is how the database job in CI proves these ran.
const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
}
if (REQUIRED && migrated.out !== "t") {
  throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the evidence-append migration is not applied");
}

const skip = reachable ? false : "no local database reachable";
const skipApplied =
  !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the evidence-append migration is not applied";

test("the append contract holds in real Postgres", { skip: skipApplied }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_evidence_append.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

// A database migrated one statement at a time can hide an ordering fault,
// since an earlier pass left the object a later statement needs. This
// replays the migration over a dropped copy of everything it creates.
test("the migration applies to a database that has never seen it", { skip }, () => {
  const root = path.join(__dirname, "..");
  const run = spawnSync(
    "psql",
    [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", "supabase/tests/research_os_evidence_append_fresh.sql"],
    { encoding: "utf8", cwd: root },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("two writers racing on one row keep both events", { skip: skipApplied }, async (t) => {
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

test("a teacher override lowers the stage through overrideLevel", { skip: skipApplied }, async (t) => {
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

// Every writer of the row, from the database's own catalog. A regex over
// src/ cannot see a Postgres function, and graph.privacy_delete_learner is
// one, so the invariant is stated where it can be checked: the application
// writes through db.ts, and the functions that write the table are the ones
// named here. graph.override_level is absent on purpose: it locks the row
// and appends through append_evidence, so it writes no statement of its own.
test("the writers of learner_node_state are the ones we know about", { skip: skipApplied }, () => {
  const functions = sql(`
    select string_agg(p.proname, ',' order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'graph'
      and p.prosrc ilike '%learner_node_state%'
      and (p.prosrc ilike '%insert into graph.learner_node_state%'
        or p.prosrc ilike '%update graph.learner_node_state%'
        or p.prosrc ilike '%delete from graph.learner_node_state%')
  `);
  assert.equal(
    functions.out,
    "append_evidence,privacy_delete_learner",
    `an unknown function writes learner_node_state: ${functions.out}`,
  );

  // The application writes through the functions above. A PostgREST chain
  // that names the table and then writes is read statement by statement, so
  // a file that only reads it, or writes another table, is not flagged.
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        for (const statement of text.split(";")) {
          if (!/from\(\s*["'`]learner_node_state["'`]\s*\)/.test(statement)) continue;
          if (!/\.(upsert|update|insert|delete)\(/.test(statement)) continue;
          offenders.push(path.relative(path.join(__dirname, ".."), full));
          break;
        }
      }
    }
  };
  walk(path.join(__dirname, "..", "src"));
  assert.deepEqual(offenders, [], `these write learner_node_state directly: ${offenders.join(", ")}`);

  // The scan above is advisory: a table name held in a variable or a write
  // from outside src/ would pass it. The grant is what enforces the
  // invariant, so it is asserted here.
  const writes = sql(`
    select string_agg(priv, ',' order by priv) from (
      select unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) as priv
    ) p
    where has_table_privilege('service_role', 'graph.learner_node_state', p.priv)
  `);
  assert.equal(writes.out, "", `service_role can still write the table directly: ${writes.out}`);

  const reads = sql(`select has_table_privilege('service_role', 'graph.learner_node_state', 'SELECT')`);
  assert.equal(reads.out, "t", "service_role keeps its reads");

  const definers = sql(`
    select string_agg(p.proname, ',' order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'graph' and p.proname in ('append_evidence','override_level','privacy_delete_learner')
      and p.prosecdef
  `);
  assert.equal(
    definers.out,
    "append_evidence,override_level,privacy_delete_learner",
    `every writer runs as its definer: ${definers.out}`,
  );
});

test("a same-stage event keeps a streak alive and awards nothing", { skip: skipApplied }, async (t) => {
  const learner = randomUUID();
  const node = randomUUID();

  const made = sql(`
    insert into auth.users (id, instance_id, aud, role, email)
      values ('${learner}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'streak-${learner}@bucket.test');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      values ('${node}', 'streak-fixture-${node}', 'Streak fixture', 'concept', 10, '01-mathematics', 'fixture');
    insert into graph.learner_profiles (learner_id, xp, streak_days, last_active_day)
      values ('${learner}', 0, 3, '2020-01-01')
      on conflict (learner_id) do update set xp = 0, streak_days = 3, last_active_day = '2020-01-01', badges = '[]'::jsonb;
    select graph.append_evidence('${learner}', '${node}', 'awareness', '{"kind":"open"}'::jsonb);
    update graph.learner_profiles set xp = 0, streak_days = 3, last_active_day = '2020-01-01' where learner_id = '${learner}';
    select 'made';
  `);
  assert.equal(made.status, 0, made.out);

  t.after(() => {
    sql(`delete from graph.learner_node_state where learner_id = '${learner}';
         delete from graph.learner_profiles where learner_id = '${learner}';
         delete from graph.nodes where id = '${node}';
         delete from auth.users where id = '${learner}';`);
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { recordEvidence } = require("../src/lib/research-os/db") as typeof import("../src/lib/research-os/db");
  const again = await recordEvidence(learner, node, "awareness", { kind: "check", at: new Date().toISOString() });
  assert.equal(again.awards, false, "a stage already credited awards nothing");

  const profile = sql(`select xp || '|' || streak_days || '|' || coalesce(last_active_day::text, 'null')
                       from graph.learner_profiles where learner_id = '${learner}'`);
  const [xp, streak, day] = profile.out.split("|");
  assert.equal(xp, "0", `no XP for a stage already credited, got ${xp}`);
  assert.equal(streak, "1", `the streak restarts on a new day, got ${streak}`);
  assert.notEqual(day, "2020-01-01", `the day the learner was last active moves, got ${day}`);
});

test("a demote and a re-promote award no XP twice", { skip: skipApplied }, async (t) => {
  const learner = randomUUID();
  const teacher = randomUUID();
  const node = randomUUID();
  const klass = randomUUID();
  const email = `xp-${learner}@bucket.test`;

  const made = sql(`
    insert into auth.users (id, instance_id, aud, role, email) values
      ('${learner}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${email}'),
      ('${teacher}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'xp-teacher-${teacher}@bucket.test');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      values ('${node}', 'xp-fixture-${node}', 'XP fixture', 'concept', 10, '01-mathematics', 'fixture');
    insert into graph.classes (id, name, reviewer_email, created_by)
      values ('${klass}', 'XP fixture class', 'xp-teacher-${teacher}@bucket.test', '${teacher}');
    insert into graph.class_members (class_id, learner_id, role) values ('${klass}', '${learner}', 'learner');
    insert into graph.learner_profiles (learner_id, xp) values ('${learner}', 0)
      on conflict (learner_id) do update set xp = 0, badges = '[]'::jsonb;
    select 'made';
  `);
  assert.equal(made.status, 0, made.out);

  t.after(() => {
    sql(`delete from graph.level_overrides where learner_id = '${learner}';
         delete from graph.learner_node_state where learner_id = '${learner}';
         delete from graph.class_members where class_id = '${klass}';
         delete from graph.classes where id = '${klass}';
         delete from graph.learner_profiles where learner_id = '${learner}';
         delete from graph.nodes where id = '${node}';
         delete from auth.users where id in ('${learner}', '${teacher}');`);
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { recordEvidence } = require("../src/lib/research-os/db") as typeof import("../src/lib/research-os/db");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { overrideLevel } = require("../src/lib/research-os/class-db") as typeof import("../src/lib/research-os/class-db");

  await recordEvidence(learner, node, "production", { kind: "production_submitted", at: new Date().toISOString() });
  const climbed = sql(`select xp from graph.learner_profiles where learner_id = '${learner}'`);
  const afterClimb = Number(climbed.out);
  assert.ok(afterClimb > 0, `the climb awards XP, got ${climbed.out}`);

  const staff = { id: teacher, email: `xp-teacher-${teacher}@bucket.test`, roles: ["teacher" as const] };
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const down = await overrideLevel(staff, klass, learner, node, "awareness", "returned for revision");
    assert.equal(down.ok, true, JSON.stringify(down));
    const up = await recordEvidence(learner, node, "production", { kind: "production_submitted", at: new Date().toISOString() });
    assert.equal(up.stage, "production", "the learner climbs back");
    assert.equal(up.awards, false, "a stage already credited awards nothing");
  }

  const after = sql(`select xp from graph.learner_profiles where learner_id = '${learner}'`);
  assert.equal(Number(after.out), afterClimb, `three demote and re-promote cycles award nothing, got ${after.out}`);
});

test("a failed audit row leaves the stage where it was", { skip: skipApplied }, async (t) => {
  const learner = randomUUID();
  const teacher = randomUUID();
  const node = randomUUID();
  const klass = randomUUID();
  const missingClass = randomUUID();

  const made = sql(`
    insert into auth.users (id, instance_id, aud, role, email) values
      ('${learner}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit-${learner}@bucket.test'),
      ('${teacher}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit-teacher-${teacher}@bucket.test');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      values ('${node}', 'audit-fixture-${node}', 'Audit fixture', 'concept', 10, '01-mathematics', 'fixture');
    insert into graph.classes (id, name, reviewer_email, created_by)
      values ('${klass}', 'Audit fixture class', 'audit-teacher-${teacher}@bucket.test', '${teacher}');
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

  // The audit insert fails on its class foreign key, which is the failure
  // that used to leave a committed demotion with nothing to explain it.
  const attempt = sql(`select graph.override_level('${learner}', '${node}', '${teacher}', '${missingClass}', 'awareness', 'no such class')`);
  assert.notEqual(attempt.status, 0, "an unknown class refuses the override");

  const stage = sql(`select stage from graph.learner_node_state where learner_id = '${learner}' and node_id = '${node}'`);
  assert.equal(stage.out, "production", `the stage did not move, got ${stage.out}`);

  const events = sql(`select count(*) from graph.learner_node_state, jsonb_array_elements(evidence) e
                      where learner_id = '${learner}' and node_id = '${node}' and e->>'kind' = 'override'`);
  assert.equal(events.out, "0", `no override event was written, got ${events.out}`);

  const audits = sql(`select count(*) from graph.level_overrides where learner_id = '${learner}'`);
  assert.equal(audits.out, "0", `no audit row was written, got ${audits.out}`);
});
