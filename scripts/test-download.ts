import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CONSENT_VERSION, isExpired, parseDownload } from "../src/lib/download/core";
import { DEFAULT_NOTIFY_TO, LINK_TTL_MS, downloadLink, linkValid, resendNotifier } from "../src/lib/download/notify";
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
    assert.deepEqual(ok.request.input, { email: "ada@example.org", name: null, role: null, wanted: "/download?platform=linux-x64", consent_version: CONSENT_VERSION });
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
    const notify: DownloadNotifier = async (r, first) => void calls.push([r.input.email, first]);
    const deps = { store: (s: boolean) => (s ? held : main), notify };
    assert.deepEqual(await handleDownload({ email: "ada@example.org", consent: true }, "1.1.1.1", deps), { status: 200, body: { ok: true } });
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
    assert.equal((await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => main, notify: boom })).status, 200);
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
    assert.equal(await purgeExpired(main, new Date("2026-09-29T00:00:00.000Z")), 1);
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

test("download links are signed, expire after 24 hours and reject tampering", () => {
  const now = 1_800_000_000_000;
  const url = new URL(downloadLink("https://bucket.foundation", "s3cret", now));
  const e = url.searchParams.get("e");
  const s = url.searchParams.get("s");
  assert.equal(url.pathname, "/api/download/file");
  assert.equal(linkValid(e, s, "s3cret", now + LINK_TTL_MS - 1), true);
  assert.equal(linkValid(e, s, "s3cret", now + LINK_TTL_MS + 1), false);
  assert.equal(linkValid(e, s, "other", now), false);
  assert.equal(linkValid(String(Number(e) + 1), s, "s3cret", now), false);
  assert.equal(linkValid(e, s, undefined, now), false);
});

test("resendNotifier sends the founder email and time only, and the downloader a link", async () => {
  const sent: { url: string; body: Record<string, string> }[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response("{}", { status: 200 });
  };
  const notify = resendNotifier({ RESEND_API_KEY: "re_x", DOWNLOAD_LINK_SECRET: "s3cret" }, fetcher, () => Date.parse("2026-09-29T12:00:00.000Z"));
  assert.ok(notify);
  const parsed = parseDownload({ email: "ada@example.org", name: "Ada Lovelace", consent: true, platform: "linux-x64" });
  assert.ok(parsed.ok);
  if (!parsed.ok || !notify) return;
  await notify(parsed.request, true);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].url, "https://api.resend.com/emails");
  assert.equal(sent[0].body.to, DEFAULT_NOTIFY_TO);
  assert.equal(sent[0].body.text, "ada@example.org requested the desktop app at 2026-09-29T12:00:00.000Z.");
  assert.equal(sent[1].body.to, "ada@example.org");
  assert.match(sent[1].body.text, /https:\/\/bucket\.foundation\/api\/download\/file\?e=\d+&s=/);
  assert.equal(resendNotifier({}, fetcher), null);
  sent.length = 0;
  await resendNotifier({ RESEND_API_KEY: "re_x", DOWNLOAD_NOTIFY_TO: "ops@example.org" }, fetcher)?.(parsed.request, true);
  assert.deepEqual(sent.map((m) => m.body.to), ["ops@example.org"]);
});

test("a Resend failure is logged and the capture still returns 200", async () => {
  const { root, main } = await tempStores();
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void errors.push(args.join(" "));
  try {
    const notify = resendNotifier({ RESEND_API_KEY: "re_x", DOWNLOAD_LINK_SECRET: "s" }, async () => new Response("down", { status: 500 }));
    const res = await handleDownload({ email: "ada@example.org", consent: true }, "ip", { store: () => main, notify: notify ?? undefined });
    assert.equal(res.status, 200);
    assert.ok(await main.read(emailKey("ada@example.org")));
    assert.match(errors[0] ?? "", /notify failed: resend 500/);
  } finally {
    console.error = original;
    await rm(root, { recursive: true, force: true });
  }
});
