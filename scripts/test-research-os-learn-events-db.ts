import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { loadLocalEnv, TEST_DB as DB } from "./lib/test-harness";

loadLocalEnv();

const probe = spawnSync("psql", [DB, "-At", "-c", "select to_regclass('bucket.learn_events') is not null"], { encoding: "utf8" });
const ready = probe.status === 0 && probe.stdout.trim() === "t";
const keyed = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !(ready && keyed)) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no local database with the learn_events migration and service key");
  process.exit(1);
}

const skip = ready ? false : "no local database with the learn_events migration";
const skipRpc = ready && keyed ? false : "no local Supabase URL and keys in .env.local";

function psql(statement: string) {
  return spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
}

function makeUser(band: string | null, consent = "none"): string {
  const id = randomUUID();
  const profile = band === null ? "" : `insert into graph.learner_profiles (learner_id, role, birth_year_bucket, consent_status) values ('${id}', 'independent', '${band}', '${consent}');`;
  const run = psql(`insert into auth.users (id, instance_id, aud, role, email) values ('${id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'events-${id}@bucket.test'); ${profile}`);
  assert.equal(run.status, 0, run.stderr);
  return id;
}

function dropUser(id: string) {
  psql(`delete from bucket.learn_events where user_id = '${id}'; delete from graph.learner_profiles where learner_id = '${id}'; delete from auth.users where id = '${id}';`);
}

function record(user: string, event: string, name = "assess_done", props = '{"branch":"02-physics"}') {
  return psql(`begin; set local role service_role; select bucket.record_learn_event('${user}', '${event}', '${name}', '${props}'::jsonb, null); commit;`);
}

function count(user: string): string {
  return psql(`select count(*) from bucket.learn_events where user_id = '${user}'`).stdout.trim();
}

test("anon and authenticated are refused the table and the writer", { skip }, () => {
  for (const role of ["anon", "authenticated"]) {
    for (const statement of [
      "select count(*) from bucket.learn_events",
      `insert into bucket.learn_events (user_id, event_id, name) values ('${randomUUID()}', '${randomUUID()}', 'assess_done')`,
      "delete from bucket.learn_events",
      `select bucket.record_learn_event('${randomUUID()}', '${randomUUID()}', 'assess_done', '{}'::jsonb, null)`,
    ]) {
      const run = psql(`begin; grant usage on schema bucket to ${role}; set local role ${role}; ${statement}; rollback;`);
      assert.notEqual(run.status, 0, `${role} ran: ${statement}`);
      assert.match(run.stderr, /permission denied/, `${role}: ${statement}: ${run.stderr}`);
    }
  }
});

test("the event counter refuses anon and authenticated and counts per user, name and day for the service role", { skip }, () => {
  for (const role of ["anon", "authenticated"]) {
    for (const statement of ["select count(*) from graph.event_usage", `select graph.event_usage_hit('${randomUUID()}', 'assess_done')`]) {
      const run = psql(`begin; grant usage on schema graph to ${role}; set local role ${role}; ${statement}; rollback;`);
      assert.notEqual(run.status, 0, `${role} ran: ${statement}`);
      assert.match(run.stderr, /permission denied/);
    }
  }
  const rls = psql("select relrowsecurity and relforcerowsecurity from pg_class where oid = 'graph.event_usage'::regclass");
  assert.equal(rls.stdout.trim(), "t");
  const user = makeUser("18plus");
  try {
    const run = psql(
      `begin; set local role service_role; select graph.event_usage_hit('${user}', 'assess_done'); select graph.event_usage_hit('${user}', 'assess_done'); select graph.event_usage_hit('${user}', 'placement_done'); rollback;`,
    );
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(run.stdout.split("\n").filter((l) => /^\d+$/.test(l)), ["1", "2", "1"]);
  } finally {
    dropUser(user);
  }
});

test("row level security is forced, so a stray grant still reads nothing and writes nothing", { skip }, () => {
  const rls = psql("select relrowsecurity and relforcerowsecurity from pg_class where oid = 'bucket.learn_events'::regclass");
  assert.equal(rls.stdout.trim(), "t");
  const policies = psql("select count(*) from pg_policies where schemaname = 'bucket' and tablename = 'learn_events'");
  assert.equal(policies.stdout.trim(), "0");
  const user = makeUser("18plus");
  try {
    assert.equal(record(user, randomUUID()).status, 0);
    const read = psql(
      `begin; grant usage on schema bucket to authenticated; grant select, insert on bucket.learn_events to authenticated; set local role authenticated; select count(*) from bucket.learn_events where user_id = '${user}'; rollback;`,
    );
    assert.equal(read.status, 0, read.stderr);
    assert.equal(read.stdout.split("\n").filter((l) => /^\d+$/.test(l))[0], "0");
    const write = psql(
      `begin; grant usage on schema bucket to authenticated; grant select, insert on bucket.learn_events to authenticated; set local role authenticated; insert into bucket.learn_events (user_id, event_id, name) values ('${user}', '${randomUUID()}', 'assess_done'); rollback;`,
    );
    assert.notEqual(write.status, 0);
    assert.match(write.stderr, /row-level security/);
    assert.equal(count(user), "1");
  } finally {
    dropUser(user);
  }
});

test("the writer refuses a missing profile and every minor band, consented or not", { skip }, () => {
  const users = [makeUser(null), makeUser("under13"), makeUser("13to17", "parent"), makeUser("13to17", "school")];
  try {
    for (const user of users) {
      const run = record(user, randomUUID());
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stdout, /^refused$/m);
      assert.equal(count(user), "0");
    }
  } finally {
    users.forEach(dropUser);
  }
});

test("a retried event id records once, and a name outside the list is refused by the check", { skip }, () => {
  const user = makeUser("18plus");
  try {
    const event = randomUUID();
    assert.match(record(user, event).stdout, /^recorded$/m);
    assert.match(record(user, event).stdout, /^duplicate$/m);
    assert.equal(count(user), "1");
    const bad = record(user, randomUUID(), "page_view");
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /check constraint/);
  } finally {
    dropUser(user);
  }
});

test("privacy delete removes the learner's events and reports the count", { skip }, () => {
  const user = makeUser("18plus");
  try {
    record(user, randomUUID());
    record(user, randomUUID(), "placement_done");
    const run = psql(
      `begin; do $$ begin if to_regclass('bucket.academy_profiles') is null then execute 'create table bucket.academy_profiles (user_id uuid)'; end if; end $$; set local role service_role; select graph.privacy_delete_learner('${user}') ->> 'learn_events'; reset role; select count(*) || ' left' from bucket.learn_events where user_id = '${user}'; rollback;`,
    );
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /^2$/m);
    assert.match(run.stdout, /^0 left$/m);
  } finally {
    dropUser(user);
  }
});

test("an assessment run posted twice through the route lands as one row with its verdicts", { skip: skipRpc }, async () => {
  const { handleLearnEvent } = await import("../src/app/api/academy/event/handler");
  const { supabaseEventStore } = await import("../src/lib/academy/events-server");
  const user = makeUser("18plus");
  const minor = makeUser("13to17", "parent");
  try {
    const props = {
      branch: "02-physics",
      items: [
        { atomId: "newton-2", level: "recall", correct: true, autoGraded: true },
        { atomId: "momentum", level: "teach", correct: false, autoGraded: false },
      ],
    };
    const body = JSON.stringify({ id: randomUUID(), name: "assess_done", props });
    const send = (as: string) =>
      handleLearnEvent(new NextRequest("http://localhost/api/academy/event", { method: "POST", body }), {
        verifyUser: async () => ({ id: as, email: null }),
        store: supabaseEventStore,
      });
    const first = await send(user);
    const retry = await send(user);
    assert.deepEqual(await first.json(), { recorded: true, outcome: "recorded" });
    assert.deepEqual(await retry.json(), { recorded: false, outcome: "duplicate" });
    assert.equal(count(user), "1");
    const stored = psql(`select props::text from bucket.learn_events where user_id = '${user}' and name = 'assess_done'`);
    assert.deepEqual(JSON.parse(stored.stdout.trim()), props);

    const blocked = await send(minor);
    assert.deepEqual(await blocked.json(), { recorded: false, outcome: "under_age" });
    assert.equal(count(minor), "0");
  } finally {
    dropUser(user);
    dropUser(minor);
  }
});

test("the anon key cannot reach the writer through PostgREST", { skip: skipRpc }, async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { db: { schema: "bucket" }, auth: { persistSession: false } });
  const { data, error } = await anon.rpc("record_learn_event", { p_user_id: randomUUID(), p_event_id: randomUUID(), p_name: "assess_done", p_props: {}, p_arm: null });
  assert.equal(data, null);
  assert.ok(error, "anon reached record_learn_event");
  const read = await anon.from("learn_events").select("*").limit(1);
  assert.ok(read.error || (read.data ?? []).length === 0, "anon read learn_events");
});
