import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decidePost, funnelReport, outreachSummary, todayQueue, viewSeries, type FunnelEvent, type OutreachRow, type SocialPost } from "../src/lib/admin/polingual-ops";
import { fixtureOps } from "../src/lib/admin/polingual-ops-store";
import { FIXTURE_STAFF } from "../src/lib/admin/gate";

const NOW = new Date("2026-11-24T12:00:00.000Z");

function post(over: Partial<SocialPost>): SocialPost {
  return { id: "x", slug: "s", platform: "tiktok", scheduled_for: NOW.toISOString(), status: "ready", caption: "", preview_url: null, views: 0, likes: 0, shares: 0, approved_at: null, approved_by: null, updated_at: NOW.toISOString(), ...over };
}

test("todayQueue keeps only posts scheduled on the current UTC day, in time order", () => {
  const q = todayQueue(
    [
      post({ id: "late", scheduled_for: "2026-11-24T20:00:00Z" }),
      post({ id: "early", scheduled_for: "2026-11-24T01:00:00Z" }),
      post({ id: "yesterday", scheduled_for: "2026-11-23T23:59:00Z" }),
      post({ id: "tomorrow", scheduled_for: "2026-11-25T00:00:00Z" }),
    ],
    NOW,
  );
  assert.deepEqual(q.map((p) => p.id), ["early", "late"]);
});

test("outreachSummary counts statuses and lists open contacts that are due", () => {
  const row = (id: string, status: OutreachRow["status"], next: string | null): OutreachRow => ({ id, contact: id, org: null, channel: "email", kind: "teacher", status, last_touch: null, next_touch: next, thread_url: null });
  const s = outreachSummary([row("a", "sent", "2026-11-20T00:00:00Z"), row("b", "followup_due", null), row("c", "won", "2026-11-01T00:00:00Z"), row("d", "sent", "2026-12-01T00:00:00Z")], NOW);
  assert.equal(s.byStatus.sent, 2);
  assert.equal(s.byStatus.won, 1);
  assert.deepEqual(s.due.map((r) => r.id).sort(), ["a", "b"]);
});

test("funnelReport counts unique visitors per step by day and by first-touch source", () => {
  const ev = (visitor: string, name: string, at: string, utm: string | null = null): FunnelEvent => ({ visitor, name, utm_source: utm, at });
  const r = funnelReport([
    ev("v1", "landing_view", "2026-11-23T10:00:00Z", "tiktok"),
    ev("v1", "page_view", "2026-11-23T10:01:00Z", "instagram"),
    ev("v1", "signup", "2026-11-23T10:05:00Z"),
    ev("v1", "trial_start", "2026-11-24T09:00:00Z"),
    ev("v1", "paid", "2026-11-24T09:30:00Z"),
    ev("v2", "landing_view", "2026-11-24T08:00:00Z"),
    ev("v2", "first_lesson", "2026-11-24T08:10:00Z"),
  ]);
  assert.deepEqual(r.totals, { visits: 2, signup: 1, trial: 1, paid: 1 });
  assert.deepEqual(r.bySource.find((s) => s.source === "tiktok"), { source: "tiktok", visits: 1, signup: 1, trial: 1, paid: 1 });
  assert.equal(r.bySource.find((s) => s.source === "direct")?.visits, 1);
  assert.deepEqual(r.byDay.map((d) => d.day), ["2026-11-24", "2026-11-23"]);
  assert.equal(r.byDay[0].visits, 1);
});

test("viewSeries keeps the highest snapshot per day and ranks posts by latest views", () => {
  const s = viewSeries(
    [post({ id: "a", status: "posted", views: 10 }), post({ id: "b", status: "posted", views: 500 }), post({ id: "c", status: "ready" })],
    [
      { post_id: "a", captured_at: "2026-11-22T01:00:00Z", views: 100 },
      { post_id: "a", captured_at: "2026-11-22T20:00:00Z", views: 300 },
      { post_id: "a", captured_at: "2026-11-23T20:00:00Z", views: 900 },
    ],
  );
  assert.deepEqual(s.map((x) => x.postId), ["a", "b"]);
  assert.deepEqual(s[0].points, [{ day: "2026-11-22", views: 300 }, { day: "2026-11-23", views: 900 }]);
});

test("decidePost approves with a stamp, skips, and refuses posted or unknown posts", async () => {
  const ops = fixtureOps(NOW);
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p1", "approve", NOW), { ok: true });
  const p1 = await ops.decisions.find("p1");
  assert.equal(p1?.status, "ready");
  assert.equal(p1?.approved_by, FIXTURE_STAFF.email);
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p2", "skip", NOW), { ok: true });
  assert.equal((await ops.decisions.find("p2"))?.status, "skipped");
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p3", "skip", NOW), { ok: false, error: "already_posted" });
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "nope", "skip", NOW), { ok: false, error: "not_found" });
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p1", "delete", NOW), { ok: false, error: "bad_decision" });
});

test("decidePost reports update failures", async () => {
  const r = await decidePost({ find: async () => post({}), update: async () => { throw new Error("boom"); } }, FIXTURE_STAFF, "x", "approve", NOW);
  assert.deepEqual(r, { ok: false, error: "update_failed" });
});

test("polingual migrations lock the tables to the service role", () => {
  const dir = path.join(__dirname, "../supabase/migrations");
  for (const f of ["20261124120000_polingual_social_posts.sql", "20261124120100_polingual_outreach.sql"]) {
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    assert.match(sql, /force row level security/);
    assert.match(sql, /revoke all on bucket\.polingual_\w+ from public, anon, authenticated/);
  }
});
