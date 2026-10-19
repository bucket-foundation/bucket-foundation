import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, TEST_DB as DB } from "./lib/test-harness";

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = reachable ? sql("select to_regprocedure('bucket.register_device(uuid,text,text,text,text,uuid)') is not null") : { out: "f" };
const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
if (REQUIRED && migrated.out !== "t") throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the academy devices migration is not applied");
const skip = !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the academy devices migration is not applied";

const PK = "A".repeat(43) + "=";
const PK2 = "B".repeat(43) + "=";

function makeUser(): string {
  const id = randomUUID();
  const r = sql(`insert into auth.users (id, email, aud, role) values ('${id}', '${id}@devices.test', 'authenticated', 'authenticated')`);
  assert.equal(r.status, 0, r.out);
  return id;
}

const register = (uid: string, device: string, pk: string, session = randomUUID()) => sql(`select bucket.register_device('${uid}', '${device}', '${pk}', 'cli', 'laptop', '${session}')`).out;
const nonce = (uid: string, device: string, n: string, ttl = 120) => sql(`select bucket.use_device_nonce('${uid}', '${device}', '${n}', ${ttl})`).out;

test("register_device records the key and session, and refuses a revoked device or a changed key", { skip }, () => {
  const uid = makeUser();
  try {
    assert.equal(register(uid, "dev_a", PK), "t");
    assert.equal(register(uid, "dev_a", PK), "t");
    assert.equal(register(uid, "dev_a", PK2), "f");
    sql(`update bucket.devices set revoked_at = now() where user_id = '${uid}' and device_id = 'dev_a'`);
    assert.equal(register(uid, "dev_a", PK), "f");
    assert.equal(sql(`select kind || ' ' || (session_id is not null) from bucket.devices where user_id = '${uid}'`).out, "cli true");
  } finally {
    sql(`delete from auth.users where id = '${uid}'`);
  }
});

test("a nonce is accepted once, and an expired nonce is purged", { skip }, () => {
  const uid = makeUser();
  try {
    register(uid, "dev_n", PK);
    assert.equal(nonce(uid, "dev_n", "nonce-aaaaaaaaaaaa"), "t");
    assert.equal(nonce(uid, "dev_n", "nonce-aaaaaaaaaaaa"), "f");
    sql(`update bucket.device_nonces set expires_at = now() - interval '1 second' where device_id = 'dev_n'`);
    assert.equal(nonce(uid, "dev_n", "nonce-bbbbbbbbbbbb"), "t");
    assert.equal(sql(`select count(*) from bucket.device_nonces where device_id = 'dev_n'`).out, "1");
  } finally {
    sql(`delete from auth.users where id = '${uid}'`);
  }
});

test("deleting the account removes its devices, codes, nonces, log, cursor and baseline", { skip }, () => {
  const uid = makeUser();
  register(uid, "dev_c", PK);
  nonce(uid, "dev_c", "nonce-cccccccccccc");
  assert.equal(sql(`insert into bucket.device_codes (device_code_hash, user_code, device_id, public_key, kind, user_id, status, expires_at) values ('${"c".repeat(64)}', 'ABCD2345', 'dev_c', '${PK}', 'cli', '${uid}', 'approved', now() + interval '5 minutes')`).status, 0);
  const row = JSON.stringify([{ review_id: randomUUID(), branch: "lang", card_id: "ru:da", rating: 3, level: "recall", reviewed_at: "2026-10-19T00:00:00Z", tz: "UTC", atoms_version: "lang", device_id: "dev_c", payload_hash: "d".repeat(64) }]);
  assert.equal(sql(`select status from bucket.append_reviews('${uid}', '${row}'::jsonb)`).out, "inserted");
  const count = () =>
    sql(`select (select count(*) from bucket.devices where user_id = '${uid}') || ',' || (select count(*) from bucket.device_codes where user_id = '${uid}') || ',' || (select count(*) from bucket.device_nonces where user_id = '${uid}') || ',' || (select count(*) from bucket.academy_review_log where user_id = '${uid}') || ',' || (select count(*) from bucket.academy_sync_cursor where user_id = '${uid}') || ',' || (select count(*) from bucket.academy_review_baseline where user_id = '${uid}')`).out;
  assert.equal(count(), "1,1,1,1,1,1");
  assert.equal(sql(`delete from auth.users where id = '${uid}'`).status, 0);
  assert.equal(count(), "0,0,0,0,0,0");
});

test("deleting a device row drops its nonces", { skip }, () => {
  const uid = makeUser();
  try {
    register(uid, "dev_r", PK);
    nonce(uid, "dev_r", "nonce-rrrrrrrrrrrr");
    sql(`delete from bucket.devices where user_id = '${uid}' and device_id = 'dev_r'`);
    assert.equal(sql(`select count(*) from bucket.device_nonces where device_id = 'dev_r'`).out, "0");
  } finally {
    sql(`delete from auth.users where id = '${uid}'`);
  }
});

test("the device functions are closed to signed-in browser roles", { skip }, () => {
  const r = sql(`begin; set local role authenticated; select bucket.use_device_nonce('${randomUUID()}', 'x', 'nonce-zzzzzzzzzzzz', 60); rollback;`);
  assert.notEqual(r.status, 0);
  assert.match(r.out, /permission denied/);
});

test("re-registering a device ends its earlier sessions, and revoke_device ends them all", { skip }, () => {
  const uid = makeUser();
  try {
    const s1 = randomUUID();
    const s2 = randomUUID();
    const s3 = randomUUID();
    for (const sid of [s1, s2, s3]) assert.equal(sql(`insert into auth.sessions (id, user_id, created_at, updated_at) values ('${sid}', '${uid}', now(), now())`).status, 0);
    assert.equal(register(uid, "dev_s", PK, s1), "t");
    assert.equal(register(uid, "dev_s", PK, s2), "t");
    assert.equal(sql(`select string_agg(id::text, ',') from auth.sessions where user_id = '${uid}' and id in ('${s1}', '${s2}')`).out, s2);
    assert.equal(sql(`select count(*) from bucket.device_sessions where user_id = '${uid}' and device_id = 'dev_s'`).out, "2");
    assert.equal(sql(`select bucket.revoke_device('${uid}', 'dev_s')`).out, "1");
    assert.equal(sql(`select count(*) from auth.sessions where id in ('${s1}', '${s2}')`).out, "0");
    assert.equal(sql(`select count(*) from auth.sessions where id = '${s3}'`).out, "1");
    assert.equal(sql(`select bucket.revoke_device('${uid}', 'dev_s')`).out, "-1");
  } finally {
    sql(`delete from auth.users where id = '${uid}'`);
  }
});
