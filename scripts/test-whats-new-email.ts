import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildDigest, digestDay, oneLine, renderDigest, type RawEntry } from "../src/lib/whats-new-email/digest";
import { recordOptOut, unsubscribeSecret, unsubscribeUrl, verifyUnsubscribe } from "../src/lib/whats-new-email/unsubscribe";
import { cronAuthorized, digestConfig, optedInRecipients, sendDailyDigest, type DigestConfig, type Recipient } from "../src/lib/whats-new-email/send";
import { fileMarks } from "../src/lib/download/marks";
import { emailKey, fileStore, saveSignup } from "../src/lib/waitlist/store";
import { mergeEntry, parseEntry } from "../src/lib/waitlist/core";

const SECRET = "s".repeat(40);
const NOW = Date.parse("2026-09-30T00:10:00Z");
const CONFIG: DigestConfig = { apiKey: "re_test", secret: SECRET, from: "Bucket <w@bucket.foundation>", postalAddress: "1 Main St" };

const ENTRIES: RawEntry[] = [
  { id: "p1", date: "2026-09-29", category: "production", title: "Solver gap", summary: "Maps 3,592 problems. More detail here." },
  { id: "f1", date: "2026-09-29", category: "site-feature", title: "Explorer <b>", summary: "Adds a map." },
  { id: "r1", date: "2026-09-29", category: "release", title: "Desktop 0.2", summary: "Signed builds." },
  { id: "c1", date: "2026-09-29", category: "claim-added", title: "Claim", summary: "x" },
  { id: "old", date: "2026-09-28", category: "production", title: "Old", summary: "x" },
  { id: "today", date: "2026-09-30", category: "production", title: "Today", summary: "x" },
  { id: "p1", date: "2026-09-29", category: "production", title: "Dup", summary: "x" },
  { date: "2026-09-29", category: "production", title: "No id" },
];

test("digest takes the previous UTC day, grouped release, production, feature", () => {
  assert.equal(digestDay(NOW), "2026-09-29");
  const d = buildDigest(ENTRIES, digestDay(NOW));
  assert.deepEqual(d.groups.map((g) => g.kind), ["release", "production", "feature"]);
  assert.equal(d.count, 3);
  assert.deepEqual(d.groups[1].items[0], { id: "p1", kind: "production", title: "Solver gap", line: "Maps 3,592 problems.", link: "https://www.bucket.foundation/whats-new#p1" });
});

test("oneLine keeps the first sentence and caps its length", () => {
  assert.equal(oneLine("A b. C d."), "A b.");
  assert.ok(oneLine("word ".repeat(80)).length <= 200);
});

test("rendered email escapes titles and carries text, links and unsubscribe", () => {
  const unsub = unsubscribeUrl("ada@example.org", SECRET);
  const email = renderDigest(buildDigest(ENTRIES, "2026-09-29"), unsub, "1 Main St");
  assert.match(email.subject, /2026-09-29: 3 updates/);
  assert.ok(email.html.includes("Explorer &lt;b&gt;"));
  assert.ok(!email.html.includes("Explorer <b>"));
  assert.ok(email.html.includes(unsub.replace(/&/g, "&amp;")));
  assert.ok(email.text.includes(`Unsubscribe: ${unsub}`));
  assert.ok(email.text.includes("https://www.bucket.foundation/whats-new#r1"));
  assert.ok(email.text.includes("1 Main St"));
});

test("an empty day sends nothing and never loads recipients", async () => {
  let loaded = false;
  let calls = 0;
  const report = await sendDailyDigest({
    entries: ENTRIES.filter((e) => e.date !== "2026-09-29"),
    recipients: async () => ((loaded = true), []),
    config: CONFIG,
    now: NOW,
    fetcher: async () => (calls++, new Response("{}")),
  });
  assert.equal(report.skipped, "empty");
  assert.equal(loaded, false);
  assert.equal(calls, 0);
});

test("unsubscribe tokens verify only for the signed key and a real secret", () => {
  const url = new URL(unsubscribeUrl("ada@example.org", SECRET));
  const k = url.searchParams.get("k");
  const s = url.searchParams.get("s");
  assert.equal(k, emailKey("ada@example.org"));
  assert.equal(verifyUnsubscribe(k, s, SECRET), k);
  assert.equal(verifyUnsubscribe(emailKey("eve@example.org"), s, SECRET), null);
  assert.equal(verifyUnsubscribe(k, s, "t".repeat(40)), null);
  assert.equal(verifyUnsubscribe(k, (s![0] === "A" ? "B" : "A") + s!.slice(1), SECRET), null);
  assert.equal(verifyUnsubscribe(k, s, undefined), null);
  assert.equal(verifyUnsubscribe(k, s, "short"), null);
  assert.equal(verifyUnsubscribe(null, s, SECRET), null);
  assert.equal(verifyUnsubscribe(k!.toUpperCase(), s, SECRET), null);
  assert.equal(unsubscribeSecret({ WHATS_NEW_UNSUBSCRIBE_SECRET: "short" }), null);
});

test("cron auth needs the bearer CRON_SECRET", () => {
  const secret = "c".repeat(32);
  assert.equal(cronAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(cronAuthorized(`bearer ${secret}`, secret), true);
  assert.equal(cronAuthorized(secret, secret), false);
  assert.equal(cronAuthorized("Bearer wrong", secret), false);
  assert.equal(cronAuthorized(null, secret), false);
  assert.equal(cronAuthorized("Bearer ", ""), false);
  assert.equal(cronAuthorized(`Bearer ${secret}`, undefined), false);
});

test("config lists what is missing", () => {
  assert.deepEqual(digestConfig({}, null), { missing: ["RESEND_API_KEY", "WHATS_NEW_UNSUBSCRIBE_SECRET", "INVITE_POSTAL_ADDRESS"] });
  assert.equal("apiKey" in digestConfig({ RESEND_API_KEY: "k", INVITE_POSTAL_ADDRESS: "a" }, SECRET), true);
});

test("opt-in survives merge and parse", () => {
  const e = mergeEntry(null, { email: "a@example.org", name: null, role: null, wanted: null, whats_new_daily: true }, "2026-09-01T00:00:00Z");
  assert.equal(e.whats_new_daily, true);
  assert.equal(mergeEntry(e, { email: "a@example.org", name: null, role: null, wanted: null }, "2026-09-02T00:00:00Z").whats_new_daily, true);
  assert.equal(parseEntry(JSON.parse(JSON.stringify(e)))?.whats_new_daily, true);
  assert.equal(parseEntry({ ...e, whats_new_daily: "yes" })?.whats_new_daily, undefined);
});

test("recipients are opted-in, deduped across stores, and drop opt-outs until a newer signup", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bkt-wn-"));
  try {
    const list = fileStore(root, "list/");
    const downloads = fileStore(root, "downloads/");
    const marks = fileMarks(path.join(root, "optout"));
    const base = { name: null, role: null, wanted: null };
    await saveSignup(list, { ...base, email: "a@example.org", whats_new_daily: true }, "2026-09-01T00:00:00Z");
    await saveSignup(downloads, { ...base, email: "a@example.org", whats_new_daily: true }, "2026-09-02T00:00:00Z");
    await saveSignup(list, { ...base, email: "b@example.org" }, "2026-09-01T00:00:00Z");
    await saveSignup(downloads, { ...base, email: "c@example.org", whats_new_daily: true }, "2026-09-01T00:00:00Z");
    let got = await optedInRecipients([list, downloads], marks);
    assert.deepEqual(got.map((r) => r.email).sort(), ["a@example.org", "c@example.org"]);
    await recordOptOut(marks, emailKey("c@example.org"), Date.parse("2026-09-10T00:00:00Z"));
    got = await optedInRecipients([list, downloads], marks);
    assert.deepEqual(got.map((r) => r.email), ["a@example.org"]);
    await saveSignup(list, { ...base, email: "c@example.org", whats_new_daily: true }, "2026-09-20T00:00:00Z");
    got = await optedInRecipients([list, downloads], marks);
    assert.deepEqual(got.map((r) => r.email).sort(), ["a@example.org", "c@example.org"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sends in batches with unsubscribe headers and keeps going past failures", async () => {
  const recipients: Recipient[] = Array.from({ length: 23 }, (_, i) => ({ email: `u${i}@example.org`, key: emailKey(`u${i}@example.org`) }));
  const bodies: Record<string, unknown>[] = [];
  const keys: string[] = [];
  const report = await sendDailyDigest({
    entries: ENTRIES,
    recipients: async () => recipients,
    config: CONFIG,
    now: NOW,
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      bodies.push(body);
      keys.push((init.headers as Record<string, string>)["idempotency-key"]);
      if (body.to === "u3@example.org") return new Response("bad", { status: 422 });
      if (body.to === "u17@example.org") throw new Error("network");
      return new Response("{}");
    },
  });
  assert.deepEqual({ sent: report.sent, failed: report.failed, recipients: report.recipients, pending: report.pending }, { sent: 21, failed: 2, recipients: 23, pending: 0 });
  const first = bodies.find((b) => b.to === "u0@example.org")!;
  const headers = first.headers as Record<string, string>;
  assert.equal(headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(headers["List-Unsubscribe"], `<${unsubscribeUrl("u0@example.org", SECRET)}>`);
  assert.equal(typeof first.text, "string");
  assert.equal(typeof first.html, "string");
  assert.ok(!String(first.html).includes("u1@example.org"));
  assert.ok(keys.every((k) => /^whats-new\/2026-09-29\/[0-9a-f]{64}$/.test(k)));
});

test("a passed deadline leaves the rest pending", async () => {
  let t = 0;
  const recipients: Recipient[] = Array.from({ length: 25 }, (_, i) => ({ email: `u${i}@example.org`, key: emailKey(`u${i}@example.org`) }));
  const report = await sendDailyDigest({ entries: ENTRIES, recipients: async () => recipients, config: CONFIG, now: NOW, deadline: 0, clock: () => t++, fetcher: async () => new Response("{}") });
  assert.deepEqual({ sent: report.sent, pending: report.pending }, { sent: 10, pending: 15 });
});
