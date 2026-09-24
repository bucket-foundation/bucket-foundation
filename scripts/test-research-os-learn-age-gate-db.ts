import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { sql, loadLocalEnv } from "./lib/test-harness";

loadLocalEnv();

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const probe = sql("select to_regclass('bucket.academy_progress') is not null and to_regclass('graph.learner_profiles') is not null");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ready = probe.status === 0 && probe.out === "t" && Boolean(url) && Boolean(serviceKey);
if (REQUIRED && !ready) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and the local stack is not reachable: ${probe.out}`);
const skip = ready ? false : "no local stack with a Supabase URL and service key";

async function makeUser(): Promise<{ id: string; token: string }> {
  const email = `age-gate-${randomUUID()}@bucket.test`;
  const password = `pw-${randomUUID()}`;
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = (await created.json()) as { id?: string };
  assert.ok(user.id);
  const signedIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: serviceKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = (await signedIn.json()) as { access_token?: string };
  assert.ok(session.access_token);
  return { id: user.id as string, token: session.access_token as string };
}

async function removeUser(id: string): Promise<void> {
  sql(`delete from bucket.academy_progress where user_id = '${id}'; delete from graph.learner_profiles where learner_id = '${id}';`);
  await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
}

async function call(handler: (req: NextRequest, p?: unknown) => Promise<Response>, path: string, token: string, body: unknown) {
  const res = await handler(
    new NextRequest(`http://127.0.0.1${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
    {},
  );
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

const PROGRESS = { branch: "02-physics", data: { cards: {} } };

test("Learn progress writes follow the age band", { skip }, async () => {
  const progress = await import("../src/app/api/academy/progress/route");
  const profile = await import("../src/app/api/research-os/profile/route");
  const u = await makeUser();
  try {
    const first = await call(progress.POST, "/api/academy/progress", u.token, PROGRESS);
    assert.equal(first.status, 403);
    assert.equal(first.json.error, "no_profile");
    assert.equal(first.json.needsProfile, true);

    assert.equal((await call(profile.POST, "/api/research-os/profile", u.token, { role: "student", birthYearBucket: "13to17" })).status, 200);
    const minor = await call(progress.POST, "/api/academy/progress", u.token, PROGRESS);
    assert.equal(minor.status, 403);
    assert.equal(minor.json.error, "minor_read_only");
    assert.equal(sql(`select count(*) from bucket.academy_progress where user_id = '${u.id}'`).out, "0");

    const raise = await call(profile.POST, "/api/research-os/profile", u.token, { role: "student", birthYearBucket: "18plus" });
    assert.equal(raise.status, 403);
    assert.equal(raise.json.error, "age_band_locked");
  } finally {
    await removeUser(u.id);
  }
});

test("an adult writes progress, and choosing under 13 deletes it and locks the band", { skip }, async () => {
  const progress = await import("../src/app/api/academy/progress/route");
  const profile = await import("../src/app/api/research-os/profile/route");
  const u = await makeUser();
  try {
    assert.equal((await call(profile.POST, "/api/research-os/profile", u.token, { role: "independent", birthYearBucket: "18plus" })).status, 200);
    const wrote = await call(progress.POST, "/api/academy/progress", u.token, PROGRESS);
    assert.equal(wrote.status, 200, JSON.stringify(wrote.json));
    assert.equal(sql(`select count(*) from bucket.academy_progress where user_id = '${u.id}'`).out, "1");

    const child = await call(profile.POST, "/api/research-os/profile", u.token, { role: "student", birthYearBucket: "under13" });
    assert.equal(child.status, 200, JSON.stringify(child.json));
    assert.equal(child.json.deleted, true);
    assert.equal(sql(`select count(*) from bucket.academy_progress where user_id = '${u.id}'`).out, "0");
    assert.equal(sql(`select birth_year_bucket from graph.learner_profiles where learner_id = '${u.id}'`).out, "under13");

    const blocked = await call(progress.POST, "/api/academy/progress", u.token, PROGRESS);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.error, "under_13");
    const relabel = await call(profile.POST, "/api/research-os/profile", u.token, { role: "independent", birthYearBucket: "18plus" });
    assert.equal(relabel.status, 403);
    assert.equal(relabel.json.error, "age_band_locked");
  } finally {
    await removeUser(u.id);
  }
});

test("academy_profiles exists from migrations and refuses anon and authenticated", { skip }, () => {
  assert.equal(sql("select to_regclass('bucket.academy_profiles') is not null").out, "t");
  for (const role of ["anon", "authenticated"]) {
    const run = sql(`begin; grant usage on schema bucket to ${role}; set local role ${role}; select count(*) from bucket.academy_profiles; rollback;`);
    assert.notEqual(run.status, 0, role);
    assert.match(run.out, /permission denied/);
  }
});
