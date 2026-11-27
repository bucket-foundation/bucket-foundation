import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { loadLocalEnv, TEST_DB as DB } from "./lib/test-harness";

loadLocalEnv();

const probe = spawnSync("psql", [DB, "-At", "-c", "select to_regprocedure('bucket.record_learn_events_batch(uuid,jsonb,jsonb)') is not null"], { encoding: "utf8" });
const ready = probe.status === 0 && probe.stdout.trim() === "t";

if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no local database with record_learn_events_batch");
  process.exit(1);
}

const skip = ready ? false : "no local database with the learn_events_input migration";
const CAPS = '{"exposure":2,"session_mix":60}';

function psql(statement: string) {
  return spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
}

function makeUser(band: string | null): string {
  const id = randomUUID();
  const profile = band === null ? "" : `insert into graph.learner_profiles (learner_id, role, birth_year_bucket) values ('${id}', 'independent', '${band}');`;
  const run = psql(`insert into auth.users (id, instance_id, aud, role, email) values ('${id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batch-${id}@bucket.test'); ${profile}`);
  assert.equal(run.status, 0, run.stderr);
  return id;
}

function dropUser(id: string) {
  psql(`delete from bucket.learn_events where user_id = '${id}'; delete from graph.learner_profiles where learner_id = '${id}'; delete from auth.users where id = '${id}';`);
}

function batch(user: string, events: { id: string; name: string }[]): { id: string; outcome: string }[] {
  const body = JSON.stringify(events.map((e) => ({ event_id: e.id, name: e.name, props: {} })));
  const run = psql(`begin; set local role service_role; select bucket.record_learn_events_batch('${user}', '${body}'::jsonb, '${CAPS}'::jsonb); commit;`);
  assert.equal(run.status, 0, run.stderr);
  const line = run.stdout.split("\n").find((l) => l.startsWith("["));
  return JSON.parse(line ?? "[]");
}

function count(user: string): number {
  return Number(psql(`select count(*) from bucket.learn_events where user_id = '${user}'`).stdout.trim());
}

const exposures = (n: number) => Array.from({ length: n }, () => ({ id: randomUUID(), name: "exposure" }));

test("the batch writer records up to the daily cap and marks the rest rate_limited", { skip }, () => {
  const user = makeUser("18plus");
  try {
    const events = [...exposures(3), { id: randomUUID(), name: "session_mix" }];
    assert.deepEqual(batch(user, events).map((r) => r.outcome), ["recorded", "recorded", "rate_limited", "recorded"]);
    assert.equal(count(user), 3);
  } finally {
    dropUser(user);
  }
});

test("a retried batch dedupes before the cap check and a limited row stays limited", { skip }, () => {
  const user = makeUser("18plus");
  try {
    const events = exposures(3);
    batch(user, events);
    const again = batch(user, events);
    assert.deepEqual(again.map((r) => r.outcome), ["duplicate", "duplicate", "rate_limited"]);
    assert.equal(count(user), 2);
  } finally {
    dropUser(user);
  }
});

test("a minor or a missing profile is refused and nothing is written", { skip }, () => {
  for (const band of ["13to17", "under13", null]) {
    const user = makeUser(band);
    try {
      assert.ok(batch(user, exposures(2)).every((r) => r.outcome === "refused"), String(band));
      assert.equal(count(user), 0);
    } finally {
      dropUser(user);
    }
  }
});

test("anon and authenticated cannot call the batch writer", { skip }, () => {
  for (const role of ["anon", "authenticated"]) {
    const run = psql(`begin; grant usage on schema bucket to ${role}; set local role ${role}; select bucket.record_learn_events_batch('${randomUUID()}', '[]'::jsonb, '{}'::jsonb); rollback;`);
    assert.notEqual(run.status, 0, role);
    assert.match(run.stderr, /permission denied/);
  }
});
