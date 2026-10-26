import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { buildReport, summarizeGroup } from "../src/lib/beta/metrics";
import { buildGrowthReport, cadenceFor, weekStart } from "../src/lib/growth/report";
import { parseSnapshot, type GrowthSnapshot } from "../src/lib/growth/snapshot";
import type { SnapshotStore } from "../src/lib/growth/store";
import type { WaitlistEntry } from "../src/lib/waitlist/core";
import { handleGrowthReport, handleGrowthSnapshot, type GrowthDeps } from "../src/app/api/admin/growth/handler";
import { memory, NOW } from "./beta-memory-store";

const KEY = "k".repeat(24);
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "../tests/fixtures/growth/snapshot.json"), "utf8"));

function entry(email: string, created: string): WaitlistEntry {
  return { email, name: null, role: null, wanted: null, created_at: created, updated_at: created, signups: 1 };
}

const WAITLIST = [entry("a@x.co", "2026-10-19T10:00:00Z"), entry("b@x.co", "2026-10-20T10:00:00Z"), entry("c@x.co", "2026-10-26T10:00:00Z")];

test("parseSnapshot accepts the fixture and refuses tester PII or bad states", () => {
  const ok = parseSnapshot(FIXTURE);
  assert.ok(ok.ok);
  if (ok.ok) assert.equal(ok.value.testers[0].hasOwnProperty("email"), false);
  assert.equal(parseSnapshot({ ...FIXTURE, testers: [{ app: "bucket", state: "WAITING" }] }).ok, false);
  assert.equal(parseSnapshot({ ...FIXTURE, builds: [{ ...FIXTURE.builds[0], uploadedAt: "soon" }] }).ok, false);
  assert.equal(parseSnapshot({ ...FIXTURE, takenAt: 1 }).ok, false);
  const stripped = parseSnapshot({ ...FIXTURE, testers: [{ app: "bucket", state: "INSTALLED", email: "t@x.co", firstName: "T" }] });
  assert.ok(stripped.ok);
  if (stripped.ok) assert.deepEqual(stripped.value.testers, [{ app: "bucket", state: "INSTALLED" }]);
});

test("cadence lists newest first with day gaps", () => {
  const snap = parseSnapshot(FIXTURE);
  assert.ok(snap.ok);
  if (!snap.ok) return;
  const c = cadenceFor(snap.value.builds, "bucket");
  assert.deepEqual(c.map((b) => [b.build, b.daysSincePrevious]), [["12", 1.5], ["11", 4], ["10", null]]);
  assert.deepEqual(c[1].notes, ["fix(academy): card flip", "feat(beta): events"]);
});

test("weekStart is the UTC Monday", () => {
  assert.equal(weekStart("2026-10-26T10:00:00Z"), "2026-10-26");
  assert.equal(weekStart("2026-10-25T23:00:00Z"), "2026-10-19");
});

test("funnel counts signups, invites, installs and active learners", () => {
  const snap = parseSnapshot(FIXTURE);
  assert.ok(snap.ok);
  if (!snap.ok) return;
  const tester = (userId: string) => ({ userId, cohort: "default", firstApp: "bucket" as const, optedOut: false, enrolledAt: "2026-10-01T00:00:00Z" });
  const beta = buildReport(
    [tester("u"), tester("v")],
    [
      { userId: "u", app: "bucket", name: "app_open", sessionId: null, ts: "2026-10-24T00:00:00Z", props: {} },
      { userId: "v", app: "bucket", name: "app_open", sessionId: null, ts: "2026-10-01T00:00:00Z", props: {} },
    ],
    NOW,
  );
  const r = buildGrowthReport({ waitlist: WAITLIST, beta, overall: summarizeGroup("all", beta.users), snapshot: snap.value, now: NOW });
  assert.deepEqual(r.funnel.map((s) => s.count), [null, 3, 5, 3, 1]);
  assert.deepEqual(r.signupsByWeek, [{ week: "2026-10-19", count: 2 }, { week: "2026-10-26", count: 1 }]);
  assert.equal(r.medianDaysBetweenBuilds.bucket, 2.75);
  assert.equal(r.medianDaysBetweenBuilds.polingual, null);
  const empty = buildGrowthReport({ waitlist: null, beta, overall: summarizeGroup("all", beta.users), snapshot: null, now: NOW });
  assert.deepEqual(empty.funnel.map((s) => s.count), [null, null, null, null, 1]);
});

function snapStore(): SnapshotStore & { saved: GrowthSnapshot[] } {
  const saved: GrowthSnapshot[] = [];
  return { saved, latest: async () => saved[saved.length - 1] ?? null, save: async (s) => void saved.push(s) };
}

function req(method: string, key: string | null, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/growth", {
    method,
    headers: key ? { authorization: `Bearer ${key}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("growth routes sit behind the admin key and round-trip a snapshot", async () => {
  const snaps = snapStore();
  const deps: GrowthDeps = { adminKey: () => KEY, beta: () => memory(), snapshots: () => snaps, waitlist: async () => WAITLIST, now: () => NOW };
  assert.equal((await handleGrowthReport(req("GET", null), deps)).status, 404);
  assert.equal((await handleGrowthSnapshot(req("POST", "x".repeat(24), FIXTURE), deps)).status, 404);
  assert.equal((await handleGrowthSnapshot(req("POST", KEY, { takenAt: "x" }), deps)).status, 400);
  const saved = await handleGrowthSnapshot(req("POST", KEY, FIXTURE), deps);
  assert.deepEqual(await saved.json(), { ok: true, testers: 6, builds: 4 });
  const body = await (await handleGrowthReport(req("GET", KEY), deps)).json();
  assert.equal(body.snapshotAt, "2026-10-26T06:00:00.000Z");
  assert.equal(body.funnel[2].count, 5);
  assert.equal(body.cadence.bucket.length, 3);
  assert.equal((await handleGrowthReport(req("GET", KEY), { ...deps, snapshots: () => null })).status, 503);
});
