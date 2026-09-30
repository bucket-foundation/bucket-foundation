import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mergeEntry, parseEntry } from "../src/lib/waitlist/core";
import { CONSENT_VERSION, isExpired, parseDownload, sentMessage } from "../src/lib/download/core";
import { DEFAULT_NOTIFY_TO, EMAIL_COOLDOWN_MS, LINK_REUSE_MS, LINK_TTL_MS, checkLink, downloadLink, notifierConfig, redeemLink, resendNotifier } from "../src/lib/download/notify";
import { fileMarks, sharedRateLimiter, type MarkStore } from "../src/lib/download/marks";
import { forgetDownload, handleDownload, purgeExpired, rateLimiter, type DownloadNotifier } from "../src/lib/download/handler";
import { emailKey, fileStore, getWaitlistStore } from "../src/lib/waitlist/store";

async function tempStores() {
  const root = await mkdtemp(path.join(tmpdir(), "bkt-download-"));
  return { root, main: fileStore(root, "waitlist-local/downloads/"), held: fileStore(root, "waitlist-local/downloads/suspect/") };
}

test("parseDownload requires explicit consent and a valid email", () => {
  assert.deepEqual(parseDownload({ email: "ada@example.org" }), { ok: false, error: "Tick the box to agree before we store your email." });
  assert.deepEqual(parseDownload({ email: "ada@example.org", consent: "true" }), { ok: false, error: "Tick the box to agree before we store your email." });
  assert.deepEqual(parseDownload({ email: "nope", consent: true }), { ok: false, error: "Enter a valid email address." });
  const ok = parseDownload({ email: "Ada@Example.org", consent: true, platform: "linux-x64", role: "teacher", wanted: "/x" });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.request.platform, "linux-x64");
    assert.deepEqual(ok.request.input, { email: "ada@example.org", name: null, role: "teacher", research: null, wanted: "/download?platform=linux-x64", consent_version: CONSENT_VERSION });
  }
  const odd = parseDownload({ email: "ada@example.org", consent: true, platform: "amiga" });
  assert.equal(odd.ok && odd.request.platform, null);
});

test("downloads use their own prefix under the waitlist store", () => {
  assert.equal(getWaitlistStore({ BLOB_READ_WRITE_TOKEN: "x", VERCEL_ENV: "production" }, "downloads")?.prefix, "waitlist/downloads/");
  assert.equal(getWaitlistStore({ BLOB_READ_WRITE_TOKEN: "x", VERCEL_ENV: "preview" }, "downloads/suspect")?.prefix, "waitlist-preview/downloads/suspect/");
  assert.equal(getWaitlistStore({ VERCEL: "1" }, "downloads"), null);
});

test("handleDownload saves, calls the notifier once per request, and holds honeypot hits", async () => {
  const { root, main, held } = await tempStores();
  try {
    const calls: [string, boolean][] = [];
    const notify: DownloadNotifier = async (r, first) => {
      calls.push([r.input.email, first]);
      return "sent";
    };
    const deps = { store: (s: boolean) => (s ? held : main), notify };
    assert.deepEqual(await handleDownload({ email: "ada@example.org", consent: true }, "1.1.1.1", deps), { status: 200, body: { ok: true, email: "sent" } });
    assert.deepEqual(await handleDownload({ email: "bob@example.org", consent: true }, "1.1.1.1", { store: () => main }), { status: 200, body: { ok: true, email: "off" } });
    await main.remove(emailKey("bob@example.org"));
    await handleDownload({ email: "ada@example.org", consent: true }, "1.1.1.1", deps);
    assert.deepEqual(calls, [["ada@example.org", true], ["ada@example.org", false]]);
    assert.equal((await main.read(emailKey("ada@example.org")))?.signups, 2);

    await handleDownload({ email: "bot@example.org", consent: true, website: "x" }, "1.1.1.1", deps);
    assert.equal(calls.length, 2);
    assert.deepEqual(await held.keys(), [emailKey("bot@example.org")]);
    assert.equal(await main.read(emailKey("bot@example.org")), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("handleDownload maps failures to status codes and survives a failing notifier", async () => {
  const { root, main } = await tempStores();
  try {
    assert.equal((await handleDownload({ email: "ada@example.org" }, "ip", { store: () => main })).status, 400);
    assert.equal((await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => null })).status, 503);
    assert.equal((await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => main, limited: () => true })).status, 429);
    const broken = { ...main, write: async () => { throw new Error("disk"); } };
    assert.equal((await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => broken })).status, 502);
    const boom: DownloadNotifier = async () => { throw new Error("mail down"); };
    assert.deepEqual((await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => main, notify: boom })).body, { ok: true, email: "failed" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("retention: purgeExpired drops entries past 365 days and forgetDownload deletes on request", async () => {
  const { root, main } = await tempStores();
  try {
    const store = () => main;
    await handleDownload({ email: "old@example.org", consent: true }, "ip", { store, now: () => "2025-01-01T00:00:00.000Z" });
    await handleDownload({ email: "new@example.org", consent: true }, "ip", { store, now: () => "2026-09-01T00:00:00.000Z" });
    await handleDownload({ email: "gone@example.org", consent: true }, "ip", { store, now: () => "2026-09-01T00:00:00.000Z" });
    let tick = 0;
    assert.deepEqual(await purgeExpired(main, new Date("2026-09-29T00:00:00.000Z"), 0, () => ++tick), { removed: 0, done: false });
    assert.deepEqual(await purgeExpired(main, new Date("2026-09-29T00:00:00.000Z")), { removed: 1, done: true });
    await forgetDownload(main, "gone@example.org");
    await forgetDownload(main, "never@example.org");
    assert.deepEqual(await main.keys(), [emailKey("new@example.org")]);
    const entry = { email: "a@b.co", name: null, role: null, wanted: null, created_at: "x", updated_at: "2026-01-01T00:00:00.000Z", signups: 1 };
    assert.equal(isExpired(entry, new Date("2026-12-31T00:00:00.000Z")), false);
    assert.equal(isExpired(entry, new Date("2027-01-03T00:00:00.000Z")), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rateLimiter allows max hits per window per ip", () => {
  let t = 0;
  const limited = rateLimiter(2, 1000, () => t);
  assert.deepEqual([limited("a"), limited("a"), limited("a"), limited("b")], [false, false, true, false]);
  t = 1500;
  assert.equal(limited("a"), false);
});

test("download entries record consent time and consent text version", async () => {
  const { root, main } = await tempStores();
  try {
    await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => main, now: () => "2026-09-29T00:00:00.000Z" });
    const e = await main.read(emailKey("ada@example.org"));
    assert.equal(e?.consent_at, "2026-09-29T00:00:00.000Z");
    assert.equal(e?.consent_version, CONSENT_VERSION);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function memMarks(): MarkStore {
  const m = new Map<string, number>();
  return { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), sweep: async () => ({ removed: 0, done: true }) };
}

const CONFIG = { apiKey: "re_x", secret: "s3cret", from: "Bucket <d@bucket.foundation>", to: DEFAULT_NOTIFY_TO, origin: "https://bucket.foundation" };

test("download links bind the email hash and expiry, expire after 24 hours and reject tampering", () => {
  const now = 1_800_000_000_000;
  const url = new URL(downloadLink("https://bucket.foundation", "s3cret", "ada@example.org", now));
  const q = url.searchParams;
  assert.equal(url.pathname, "/api/download/file");
  assert.equal(q.get("k"), emailKey("ada@example.org"));
  assert.deepEqual(checkLink(q, "s3cret", now + LINK_TTL_MS - 1), { ok: true, key: emailKey("ada@example.org"), sig: q.get("s") });
  assert.equal(checkLink(q, "s3cret", now + LINK_TTL_MS + 1).ok, false);
  assert.equal(checkLink(q, "other", now).ok, false);
  assert.equal(checkLink(q, undefined, now).ok, false);
  const swapped = new URLSearchParams(q);
  swapped.set("k", emailKey("eve@example.org"));
  assert.equal(checkLink(swapped, "s3cret", now).ok, false);
  const later = new URLSearchParams(q);
  later.set("e", String(Number(q.get("e")) + 1));
  assert.equal(checkLink(later, "s3cret", now).ok, false);
});

test("redeemLink allows reuse for 10 minutes after first use, then refuses", async () => {
  const marks = memMarks();
  assert.equal(await redeemLink(marks, "sig", 1000), true);
  assert.equal(await redeemLink(marks, "sig", 1000 + LINK_REUSE_MS), true);
  assert.equal(await redeemLink(marks, "sig", 1001 + LINK_REUSE_MS), false);
  assert.equal(await redeemLink(marks, "other", 1001 + LINK_REUSE_MS), true);
});

test("notifierConfig needs the Resend key, link secret and artifact blob", () => {
  assert.equal(notifierConfig({ RESEND_API_KEY: "re_x", DOWNLOAD_LINK_SECRET: "s" }), null);
  assert.equal(notifierConfig({ RESEND_API_KEY: "re_x", DOWNLOAD_ARTIFACT_BLOB: "a" }), null);
  assert.equal(notifierConfig({ DOWNLOAD_LINK_SECRET: "s", DOWNLOAD_ARTIFACT_BLOB: "a" }), null);
  const c = notifierConfig({ RESEND_API_KEY: "re_x", DOWNLOAD_LINK_SECRET: "s", DOWNLOAD_ARTIFACT_BLOB: "a", DOWNLOAD_NOTIFY_TO: "ops@example.org" });
  assert.equal(c?.to, "ops@example.org");
  assert.equal(notifierConfig({ RESEND_API_KEY: "re_x", DOWNLOAD_LINK_SECRET: "s", DOWNLOAD_ARTIFACT_BLOB: "a" })?.to, DEFAULT_NOTIFY_TO);
});

test("resendNotifier emails the link and the founder email and time, once per address per hour", async () => {
  const sent: { url: string; body: Record<string, string> }[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response("{}", { status: 200 });
  };
  let now = Date.parse("2026-09-29T12:00:00.000Z");
  const notify = resendNotifier(CONFIG, memMarks(), fetcher, () => now);
  const parsed = parseDownload({ email: "ada@example.org", name: "Ada Lovelace", consent: true, platform: "linux-x64" });
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  assert.equal(await notify(parsed.request, true), "sent");
  assert.equal(sent.length, 2);
  assert.equal(sent[0].url, "https://api.resend.com/emails");
  assert.equal(sent[0].body.to, "ada@example.org");
  assert.match(sent[0].body.text, /https:\/\/bucket\.foundation\/api\/download\/file\?k=[0-9a-f]{64}&e=\d+&s=/);
  assert.equal(sent[1].body.to, DEFAULT_NOTIFY_TO);
  assert.equal(sent[1].body.text, "ada@example.org requested the desktop app at 2026-09-29T12:00:00.000Z.");
  assert.doesNotMatch(JSON.stringify(sent[1].body), /Ada Lovelace|linux-x64/);
  now += EMAIL_COOLDOWN_MS - 1;
  assert.equal(await notify(parsed.request, false), "cooldown");
  assert.equal(sent.length, 2);
  now += 1;
  assert.equal(await notify(parsed.request, false), "sent");
  assert.equal(sent.length, 4);
});

test("a Resend failure is logged, reported as failed, and the capture still returns 200", async () => {
  const { root, main } = await tempStores();
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void errors.push(args.join(" "));
  try {
    const notify = resendNotifier(CONFIG, memMarks(), async () => new Response("down", { status: 500 }));
    const res = await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => main, notify });
    assert.deepEqual(res, { status: 200, body: { ok: true, email: "failed" } });
    assert.ok(await main.read(emailKey("ada@example.org")));
    assert.match(errors[0] ?? "", /notify failed: resend 500/);
  } finally {
    console.error = original;
    await rm(root, { recursive: true, force: true });
  }
});

test("sharedRateLimiter counts per ip per window in the mark store", async () => {
  const { root } = await tempStores();
  try {
    let t = 0;
    const marks = fileMarks(path.join(root, "marks"));
    const a = sharedRateLimiter(marks, 2, 1000, () => t);
    const b = sharedRateLimiter(marks, 2, 1000, () => t);
    assert.deepEqual([await a("x"), await b("x"), await a("x"), await b("y")], [false, false, true, false]);
    t = 1000;
    assert.equal(await b("x"), false);
    assert.deepEqual(await marks.sweep(Date.now() + 1000, Infinity), { removed: 3, done: true });
    assert.equal(await marks.get("rate:x:1"), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sentMessage promises an email only when one was sent", () => {
  assert.match(sentMessage("sent"), /on its way/);
  assert.match(sentMessage("cooldown"), /last hour/);
  for (const o of ["off", "failed", "anything"]) assert.match(sentMessage(o), /not open yet/);
});

test("parseDownload carries role, research and opt-ins, and mergeEntry stores them", () => {
  const r = parseDownload({
    email: "ada@example.org", name: "Ada", consent: true, platform: "macos-arm64", role: "researcher",
    research: "  protein   folding ", optins: { release_notes: true, daily_whats_new: false },
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.request.input.role, "researcher");
  assert.equal(r.request.input.research, "protein folding");
  assert.deepEqual(r.request.input.optins, { release_notes: true, daily_whats_new: false });
  const entry = mergeEntry(null, r.request.input, "2026-09-30T00:00:00.000Z");
  assert.deepEqual(entry.optins, { release_notes: true, daily_whats_new: false });
  const later = mergeEntry(entry, { email: entry.email, name: null, role: null, wanted: null }, "2026-10-01T00:00:00.000Z");
  assert.deepEqual(later.optins, { release_notes: true, daily_whats_new: false });
  assert.equal(later.research, "protein folding");
  assert.deepEqual(parseEntry(JSON.parse(JSON.stringify(later)))?.optins, { release_notes: true, daily_whats_new: false });
});

test("parseDownload leaves opt-ins unset when the client sends none", () => {
  const r = parseDownload({ email: "ada@example.org", consent: true });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.request.input.optins, undefined);
});
