import { test } from "node:test";
import assert from "node:assert/strict";
import { decidePost, editCaption, fullCaption, funnelReport, outreachSummary, reviewQueue, todayQueue, viewSeries, type FunnelRow, type OutreachRow } from "./ops";
import { guardQuery } from "./store";
import { memWriter, post, POST_ID } from "./fixtures";

const NOW = new Date("2026-11-24T12:00:00.000Z");
const ADMIN = "gianyrox@gmail.com";

test("approve stamps the founder and keeps the status", async () => {
  const rows = [post()];
  assert.deepEqual(await decidePost(memWriter(rows), ADMIN, POST_ID, "approve", null, NOW), { ok: true });
  assert.equal(rows[0].status, "ready");
  assert.equal(rows[0].approved_by, ADMIN);
  assert.equal(rows[0].approved_at, NOW.toISOString());
});

test("approve saves an edited caption", async () => {
  const rows = [post()];
  await decidePost(memWriter(rows), ADMIN, POST_ID, "approve", "  New caption ", NOW);
  assert.equal(rows[0].caption, "New caption");
});

test("skip clears approval and marks skipped", async () => {
  const rows = [post({ approved_at: NOW.toISOString(), approved_by: ADMIN })];
  assert.deepEqual(await decidePost(memWriter(rows), ADMIN, POST_ID, "skip"), { ok: true });
  assert.equal(rows[0].status, "skipped");
  assert.equal(rows[0].approved_at, null);
});

test("decisions refuse without an admin and on bad input", async () => {
  const w = memWriter([post(), post({ id: "posted", status: "posted" }), post({ id: "skipped", status: "skipped" })]);
  assert.deepEqual(await decidePost(w, null, POST_ID, "approve"), { ok: false, error: "forbidden" });
  assert.deepEqual(await decidePost(w, ADMIN, POST_ID, "delete"), { ok: false, error: "bad_decision" });
  assert.deepEqual(await decidePost(w, ADMIN, "missing", "approve"), { ok: false, error: "not_found" });
  assert.deepEqual(await decidePost(w, ADMIN, "posted", "skip"), { ok: false, error: "already_posted" });
  assert.deepEqual(await decidePost(w, ADMIN, "skipped", "approve"), { ok: false, error: "already_skipped" });
  assert.deepEqual(await decidePost(w, ADMIN, POST_ID, "approve", "x".repeat(2201)), { ok: false, error: "bad_caption" });
  assert.equal(w.patches.length, 0);
});

test("a failing store reports update_failed", async () => {
  const w = { find: async () => post(), update: async () => { throw new Error("db down"); } };
  assert.deepEqual(await decidePost(w, ADMIN, POST_ID, "approve"), { ok: false, error: "update_failed" });
});

test("editCaption trims and refuses posted rows", async () => {
  const rows = [post(), post({ id: "posted", status: "posted" })];
  assert.deepEqual(await editCaption(memWriter(rows), ADMIN, POST_ID, " hi "), { ok: true });
  assert.equal(rows[0].caption, "hi");
  assert.deepEqual(await editCaption(memWriter(rows), ADMIN, "posted", "x"), { ok: false, error: "already_posted" });
  assert.deepEqual(await editCaption(memWriter(rows), null, POST_ID, "x"), { ok: false, error: "forbidden" });
});

test("reviewQueue keeps rows with an unsent platform and drops skipped", () => {
  const q = reviewQueue([
    post({ id: "a", scheduled_for: "2026-12-02T15:00:00Z" }),
    post({ id: "b", scheduled_for: "2026-12-01T15:00:00Z", status: "posted", sent: { instagram: { id: "1", at: "x", mode: "PUBLISH" } } }),
    post({ id: "c", status: "skipped" }),
    post({ id: "d", sent: { instagram: { id: "1", at: "x", mode: "PUBLISH" }, tiktok: { id: "2", at: "x", mode: "MEDIA_UPLOAD" } } }),
  ]);
  assert.deepEqual(q.map((p) => p.id), ["b", "a"]);
});

test("fullCaption appends hashtags once", () => {
  assert.equal(fullCaption({ caption: "Hi", hashtags: "#a #b" }), "Hi\n\n#a #b");
  assert.equal(fullCaption({ caption: "Hi\n\n#a #b", hashtags: "#a #b" }), "Hi\n\n#a #b");
  assert.equal(fullCaption({ caption: "Hi", hashtags: "" }), "Hi");
});

test("guardQuery blocks posted rows except for send stamps", () => {
  assert.equal(guardQuery({ approved_at: "x" }), "&status=not.in.(posted,skipped)");
  assert.equal(guardQuery({ status: "skipped" }), "&status=not.in.(posted)");
  assert.equal(guardQuery({ sent: {}, status: "posted" }), "&status=not.in.(skipped)");
});

test("todayQueue, outreachSummary, funnelReport and viewSeries match the bucket port", () => {
  assert.deepEqual(todayQueue([post({ id: "late", scheduled_for: "2026-11-24T20:00:00Z" }), post({ id: "early", scheduled_for: "2026-11-24T01:00:00Z" }), post({ id: "next", scheduled_for: "2026-11-25T00:00:00Z" })], NOW).map((p) => p.id), ["early", "late"]);
  const row = (id: string, status: OutreachRow["status"], next: string | null): OutreachRow => ({ id, contact: id, org: null, channel: "email", kind: "teacher", status, last_touch: null, next_touch: next, thread_url: null });
  const o = outreachSummary([row("a", "sent", "2026-11-20T00:00:00Z"), row("b", "followup_due", null), row("c", "won", "2026-11-01T00:00:00Z"), row("d", "sent", "2026-12-01T00:00:00Z")], NOW);
  assert.deepEqual(o.due.map((r) => r.id).sort(), ["a", "b"]);
  const f = (day: string | null, source: string | null, visits: number, paid = 0): FunnelRow => ({ day, source, visits, signup: 0, trial: 0, paid });
  const r = funnelReport([f(null, null, 9, 2), f("2026-11-23", null, 4), f("2026-11-24", null, 5, 2), f(null, "direct", 3), f(null, "tiktok", 6, 2)]);
  assert.deepEqual(r.totals, { visits: 9, signup: 0, trial: 0, paid: 2 });
  assert.deepEqual(r.bySource.map((s) => s.source), ["tiktok", "direct"]);
  const v = viewSeries([post({ id: "p", status: "posted", views: 10 })], [{ post_id: "p", captured_at: "2026-11-23T01:00:00Z", views: 5 }, { post_id: "p", captured_at: "2026-11-24T01:00:00Z", views: 12 }]);
  assert.equal(v[0].latest, 12);
});
