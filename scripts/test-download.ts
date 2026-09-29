import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isExpired, parseDownload } from "../src/lib/download/core";
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
    assert.deepEqual(ok.request.input, { email: "ada@example.org", name: null, role: null, wanted: "/download?platform=linux-x64" });
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
