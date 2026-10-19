import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { sql, TEST_DB as DB } from "./lib/test-harness";

function sqlAsync(statement: string): Promise<{ status: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("psql", [DB, "-Atq", "-v", "ON_ERROR_STOP=1", "-c", statement]);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (status) => resolve({ status: status ?? 1, out: out.trim() }));
  });
}

const probe = sql("select 1");
const reachable = probe.status === 0 && probe.out === "1";
const migrated = reachable ? sql("select to_regprocedure('bucket.append_reviews(uuid,jsonb)') is not null") : { out: "f" };
const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
if (REQUIRED && !reachable) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no database answered at ${DB}: ${probe.out}`);
if (REQUIRED && migrated.out !== "t") throw new Error("RESEARCH_OS_REQUIRE_DB=1 and the academy review-log migration is not applied");
const skip = !reachable ? "no local database reachable" : migrated.out === "t" ? false : "the academy review-log migration is not applied";

function makeUser(): string {
  const id = randomUUID();
  const r = sql(`insert into auth.users (id, email, aud, role) values ('${id}', '${id}@review-log.test', 'authenticated', 'authenticated')`);
  assert.equal(r.status, 0, r.out);
  return id;
}

function dropUser(id: string): void {
  sql(`delete from auth.users where id = '${id}'`);
}

function row(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    review_id: randomUUID(),
    branch: "lang",
    card_id: "ru:privet",
    rating: 3,
    level: "recall",
    reviewed_at: "2026-10-18T12:00:00.000Z",
    tz: "UTC",
    atoms_version: "lang",
    device_id: "dev-a",
    payload_hash: "a".repeat(64),
    ...over,
  };
}

const lit = (rows: unknown[]) => `'${JSON.stringify(rows).replace(/'/g, "''")}'::jsonb`;
const append = (uid: string, rows: unknown[]) => sql(`select status || ' ' || seq from bucket.append_reviews('${uid}', ${lit(rows)})`);

test("an append assigns seq 1, a same-hash resend is a duplicate, a different hash is a conflict", { skip }, () => {
  const uid = makeUser();
  try {
    const r = row();
    assert.equal(append(uid, [r]).out, "inserted 1");
    assert.equal(append(uid, [r]).out, "duplicate 1");
    assert.equal(append(uid, [{ ...r, payload_hash: "b".repeat(64) }]).out, "conflict 1");
    assert.equal(sql(`select count(*) || ' ' || max(seq) from bucket.academy_review_log where user_id = '${uid}'`).out, "1 1");
    assert.equal(sql(`select last_seq from bucket.academy_sync_cursor where user_id = '${uid}'`).out, "1");
  } finally {
    dropUser(uid);
  }
});

test("the first append freezes the baseline from academy_progress and registers the device", { skip }, () => {
  const uid = makeUser();
  try {
    assert.equal(sql(`insert into bucket.academy_progress (user_id, branch, data) values ('${uid}', 'lang', '{"xp": 7}')`).status, 0);
    append(uid, [row()]);
    sql(`update bucket.academy_progress set data = '{"xp": 99}' where user_id = '${uid}'`);
    append(uid, [row()]);
    assert.equal(sql(`select data->>'xp' from bucket.academy_review_baseline where user_id = '${uid}' and branch = 'lang'`).out, "7");
    assert.equal(sql(`select device_id from bucket.devices where user_id = '${uid}'`).out, "dev-a");
  } finally {
    dropUser(uid);
  }
});

test("50 concurrent appends for one user land with gapless seq 1..50", { skip }, async () => {
  const uid = makeUser();
  try {
    const runs = await Promise.all(Array.from({ length: 50 }, (_, i) => sqlAsync(`select status from bucket.append_reviews('${uid}', ${lit([row({ device_id: `dev-${i}` })])})`)));
    for (const r of runs) assert.equal(r.status, 0, r.out);
    assert.ok(runs.every((r) => r.out === "inserted"));
    const seqs = sql(`select string_agg(seq::text, ',' order by seq) from bucket.academy_review_log where user_id = '${uid}'`).out;
    assert.equal(seqs, Array.from({ length: 50 }, (_, i) => String(i + 1)).join(","));
    assert.equal(sql(`select last_seq from bucket.academy_sync_cursor where user_id = '${uid}'`).out, "50");
  } finally {
    dropUser(uid);
  }
});

test("users keep separate seq spaces and RLS hides another user's rows", { skip }, () => {
  const a = makeUser();
  const b = makeUser();
  try {
    const shared = row();
    assert.equal(append(a, [shared, row()]).out, "inserted 1\ninserted 2");
    assert.equal(append(b, [shared]).out, "inserted 1");
    const asB = (q: string) =>
      sql(`begin; grant usage on schema bucket to authenticated; grant select on bucket.academy_review_log to authenticated; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${b}","role":"authenticated"}', true); ${q}; rollback;`);
    assert.equal(sql("select has_schema_privilege('authenticated', 'bucket', 'usage')").out, "f");
    const seen = asB(`select count(*) from bucket.academy_review_log`);
    assert.equal(seen.status, 0, seen.out);
    assert.equal(seen.out.split("\n").filter((l) => /^\d+$/.test(l)).pop(), "1");
    const write = asB(`select bucket.append_reviews('${a}', ${lit([row()])})`);
    assert.notEqual(write.status, 0);
    assert.match(write.out, /permission denied for function append_reviews/);
    assert.equal(sql(`select count(*) from bucket.academy_review_log where user_id = '${a}'`).out, "2");
  } finally {
    dropUser(a);
    dropUser(b);
  }
});

test("write_progress_fold refuses a fold older than the stored one", { skip }, () => {
  const uid = makeUser();
  try {
    const fold = (seq: number, xp: number) => sql(`select bucket.write_progress_fold('${uid}', 'lang', '{"xp": ${xp}}', ${seq})`).out;
    assert.equal(fold(5, 5), "t");
    assert.equal(fold(3, 3), "f");
    assert.equal(fold(6, 6), "t");
    assert.equal(sql(`select data->>'xp' || ' ' || log_seq from bucket.academy_progress where user_id = '${uid}'`).out, "6 6");
  } finally {
    dropUser(uid);
  }
});
