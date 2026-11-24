import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decidePost, funnelReport, outreachSummary, todayQueue, viewSeries, type FunnelRow, type OutreachRow, type SocialPost } from "../src/lib/admin/polingual-ops";
import { fixtureOps } from "../src/lib/admin/polingual-ops-store";
import { FIXTURE_STAFF, resolveStaff } from "../src/lib/admin/gate";

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

test("funnelReport splits the RPC grouping sets into totals, days and sources", () => {
  const row = (day: string | null, source: string | null, visits: number, paid = 0): FunnelRow => ({ day, source, visits, signup: 0, trial: 0, paid });
  const r = funnelReport([row(null, null, 9, 2), row("2026-11-23", null, 4), row("2026-11-24", null, 5, 2), row(null, "direct", 3), row(null, "tiktok", 6, 2)]);
  assert.deepEqual(r.totals, { visits: 9, signup: 0, trial: 0, paid: 2 });
  assert.deepEqual(r.byDay.map((d) => d.day), ["2026-11-24", "2026-11-23"]);
  assert.deepEqual(r.bySource.map((d) => d.source), ["tiktok", "direct"]);
  assert.deepEqual(funnelReport([]).totals, { visits: 0, signup: 0, trial: 0, paid: 0 });
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

test("decidePost approve stamps the approver and keeps the status", async () => {
  const ops = fixtureOps(NOW);
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p2", "approve", NOW), { ok: true });
  const p2 = await ops.decisions.find("p2");
  assert.equal(p2?.status, "draft_delivered");
  assert.equal(p2?.approved_by, FIXTURE_STAFF.email);
  assert.equal(p2?.approved_at, NOW.toISOString());
});

test("decidePost skips, then refuses to approve skipped, posted or unknown posts", async () => {
  const ops = fixtureOps(NOW);
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p1", "skip", NOW), { ok: true });
  assert.equal((await ops.decisions.find("p1"))?.status, "skipped");
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p1", "approve", NOW), { ok: false, error: "already_skipped" });
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p3", "approve", NOW), { ok: false, error: "already_posted" });
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "nope", "skip", NOW), { ok: false, error: "not_found" });
  assert.deepEqual(await decidePost(ops.decisions, FIXTURE_STAFF, "p2", "delete", NOW), { ok: false, error: "bad_decision" });
});

test("decidePost reports a conflict when the guarded update touches no row", async () => {
  const r = await decidePost({ find: async () => post({}), update: async () => false }, FIXTURE_STAFF, "x", "approve", NOW);
  assert.deepEqual(r, { ok: false, error: "conflict" });
});

test("action auth path: non-staff resolve to null and decidePost refuses without touching the store", async () => {
  const env = { ADMIN_FIXTURES: "0", RESEARCH_OS_REVIEWER_EMAILS: "boss@bucket.test", NODE_ENV: "test" };
  assert.equal(resolveStaff(null, env), null);
  assert.equal(resolveStaff({ id: "u1", email: "stranger@example.test" }, env), null);
  let touched = false;
  const deps = { find: async () => ((touched = true), post({})), update: async () => ((touched = true), true) };
  assert.deepEqual(await decidePost(deps, resolveStaff({ id: "u1", email: "stranger@example.test" }, env), "x", "approve", NOW), { ok: false, error: "forbidden" });
  assert.equal(touched, false);
  const src = fs.readFileSync(path.join(__dirname, "../src/app/admin/polingual-ops/actions.ts"), "utf8");
  assert.match(src, /resolveStaff\(await getSessionUser\(\)\)/);
  assert.match(src, /if \(!staff\) notFound\(\)/);
});

test("decidePost reports update failures", async () => {
  const r = await decidePost({ find: async () => post({}), update: async (): Promise<boolean> => { throw new Error("boom"); } }, FIXTURE_STAFF, "x", "approve", NOW);
  assert.deepEqual(r, { ok: false, error: "update_failed" });
});

test("polingual migrations lock the tables to the service role", () => {
  const dir = path.join(__dirname, "../supabase/migrations");
  for (const f of ["20261124120000_polingual_social_posts.sql", "20261124120100_polingual_outreach.sql"]) {
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    assert.match(sql, /force row level security/);
    assert.match(sql, /revoke all on bucket\.polingual_\w+ from public, anon, authenticated/);
    assert.match(sql, /execute function bucket\.touch_updated_at\(\)/);
  }
  const rpc = fs.readFileSync(path.join(dir, "20261124120200_polingual_funnel_daily.sql"), "utf8");
  assert.match(rpc, /revoke all on function public\.polingual_funnel_daily\(timestamptz\) from public, anon, authenticated/);
  assert.match(rpc, /grant execute on function public\.polingual_funnel_daily\(timestamptz\) to service_role/);
});
