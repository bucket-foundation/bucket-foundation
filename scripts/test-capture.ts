import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CAPTURE_WINDOW_MS, parseCapture, storePart } from "../src/lib/capture/core";
import { handleCapture, withTimeout, type CaptureDeps } from "../src/lib/capture/handler";
import { allowedOrigin, analyticsLeg, captureEventProps, slackLeg, slackText } from "../src/lib/capture/legs";
import { rateLimiter } from "../src/lib/download/handler";
import { CONSENT_VERSION } from "../src/lib/download/core";
import { emailKey, fileStore, type StorePart, type WaitlistStore } from "../src/lib/waitlist/store";
import { FUNNEL_EVENTS, START_LEARNING_HREF } from "../src/lib/analytics/funnel";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

async function stores() {
  const dir = await mkdtemp(path.join(tmpdir(), "bkt-capture-"));
  const made = new Map<StorePart, WaitlistStore>();
  const store = (part: StorePart) => {
    if (!made.has(part)) made.set(part, fileStore(dir, `waitlist-local/${part === "list" ? "" : `${part}/`}`));
    return made.get(part)!;
  };
  return { dir, store };
}

const NOW = "2026-10-18T12:00:00.000Z";

test("parseCapture rejects unknown sources and bad emails", () => {
  assert.deepEqual(parseCapture({ email: "ada@example.org" }), { ok: false, error: "Unknown signup source." });
  assert.deepEqual(parseCapture({ source: "ads", email: "ada@example.org" }), { ok: false, error: "Unknown signup source." });
  assert.deepEqual(parseCapture({ source: "footer", email: "not-an-email" }), { ok: false, error: "Enter a valid email address." });
  assert.deepEqual(parseCapture(null), { ok: false, error: "Unknown signup source." });
});

test("download source keeps the explicit consent rule and stamps the consent version", () => {
  assert.deepEqual(parseCapture({ source: "download", email: "ada@example.org" }), { ok: false, error: "Tick the box to agree before we store your email." });
  const ok = parseCapture({ source: "download", email: "ADA@example.org", consent: true, platform: "linux-x64", release_notes: true });
  assert.ok(ok.ok);
  assert.equal(ok.input.email, "ada@example.org");
  assert.equal(ok.input.consent_version, CONSENT_VERSION);
  assert.equal(ok.download?.platform, "linux-x64");
  assert.equal(ok.record.opt_ins.release_notes, true);
});

test("polingual source needs no consent box and carries the language pair", () => {
  const ok = parseCapture({ source: "polingual", email: "lev@example.org", speaks: " English ", learning: "Russian\n", persona: "root-reader" });
  assert.ok(ok.ok);
  assert.equal(ok.input.consent_version, undefined);
  assert.deepEqual([ok.record.speaks, ok.record.learning, ok.record.persona], ["English", "Russian", "root-reader"]);
  assert.equal(ok.input.speaks, "English");
});

test("each source writes to its own store part", () => {
  assert.equal(storePart("download", false), "downloads");
  assert.equal(storePart("download", true), "downloads/suspect");
  assert.equal(storePart("polingual", false), "polingual");
  assert.equal(storePart("polingual", true), "polingual/suspect");
  assert.equal(storePart("footer", false), "list");
  assert.equal(storePart("wall", true), "suspect");
});

test("a filled honeypot is held under suspect and no leg past the store fires", async () => {
  const { dir, store } = await stores();
  let sent = 0;
  const deps: CaptureDeps = { store, now: () => NOW, notify: async () => { sent++; return "sent"; }, slack: async () => { sent++; }, analytics: async () => { sent++; } };
  const r = await handleCapture({ source: "download", email: "bot@example.org", consent: true, website: "http://spam" }, "1.1.1.1", deps);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, email: "off", delivered: { store: "dispatched", email: null, analytics: null, slack: null } });
  assert.equal(sent, 0);
  assert.ok(await store("downloads/suspect").read(emailKey("bot@example.org")));
  assert.equal(await store("downloads").read(emailKey("bot@example.org")), null);
  await rm(dir, { recursive: true, force: true });
});

test("rate limit allows one submit per IP per 30 seconds", async () => {
  let t = 0;
  const limited = rateLimiter(1, CAPTURE_WINDOW_MS, () => t);
  const { dir, store } = await stores();
  const deps: CaptureDeps = { store, limited, now: () => NOW };
  const body = { source: "footer", email: "ada@example.org" };
  assert.equal((await handleCapture(body, "2.2.2.2", deps)).status, 200);
  assert.equal((await handleCapture(body, "2.2.2.2", deps)).status, 429);
  assert.equal((await handleCapture(body, "3.3.3.3", deps)).status, 200);
  t = CAPTURE_WINDOW_MS + 1;
  assert.equal((await handleCapture(body, "2.2.2.2", deps)).status, 200);
  await rm(dir, { recursive: true, force: true });
});

test("a failing rate limit check lets the signup through", async () => {
  const { dir, store } = await stores();
  const r = await handleCapture({ source: "quiz", email: "ada@example.org" }, "ip", { store, limited: () => { throw new Error("blob down"); } });
  assert.equal(r.status, 200);
  await rm(dir, { recursive: true, force: true });
});

test("delivered map reports dispatched per configured leg and null for the rest", async () => {
  const { dir, store } = await stores();
  const seen: string[] = [];
  const deferred: Promise<unknown>[] = [];
  const r = await handleCapture({ source: "download", email: "ada@example.org", consent: true }, "ip", {
    store,
    now: () => NOW,
    notify: async () => "sent",
    slack: async (rec) => { seen.push(`slack:${rec.source}:${rec.at}`); },
    defer: (p) => deferred.push(p),
  });
  await Promise.all(deferred);
  assert.deepEqual(r.body, { ok: true, email: "sent", delivered: { store: "dispatched", email: "dispatched", analytics: null, slack: "dispatched" } });
  assert.deepEqual(seen, [`slack:download:${NOW}`]);
  const plain = await handleCapture({ source: "footer", email: "bo@example.org" }, "ip", { store, notify: async () => "sent" });
  assert.deepEqual(plain.body, { ok: true, email: "off", delivered: { store: "dispatched", email: null, analytics: null, slack: null } });
  await rm(dir, { recursive: true, force: true });
});

test("email cooldown and failure never claim delivery", async () => {
  const { dir, store } = await stores();
  const cool = await handleCapture({ source: "download", email: "ada@example.org", consent: true }, "ip", { store, notify: async () => "cooldown" });
  assert.deepEqual(cool.body, { ok: true, email: "cooldown", delivered: { store: "dispatched", email: null, analytics: null, slack: null } });
  const fail = await handleCapture({ source: "download", email: "ada@example.org", consent: true }, "ip", { store, notify: async () => { throw new Error("resend 500"); } });
  assert.equal(fail.status, 200);
  assert.equal((fail.body as { email: string }).email, "failed");
  await rm(dir, { recursive: true, force: true });
});

test("a hung email leg times out and a failing slack leg does not fail the signup", async () => {
  const { dir, store } = await stores();
  const deferred: Promise<unknown>[] = [];
  const r = await handleCapture({ source: "download", email: "ada@example.org", consent: true }, "ip", {
    store,
    timeoutMs: 20,
    notify: () => new Promise(() => {}),
    slack: async () => { throw new Error("slack 500"); },
    defer: (p) => deferred.push(p),
  });
  await Promise.all(deferred);
  assert.equal(r.status, 200);
  assert.equal((r.body as { email: string }).email, "failed");
  await rm(dir, { recursive: true, force: true });
});

test("missing store answers 503 and a write error answers 502", async () => {
  assert.equal((await handleCapture({ source: "footer", email: "a@example.org" }, "ip", { store: () => null })).status, 503);
  const broken: WaitlistStore = { kind: "file", prefix: "x/", read: async () => null, write: async () => { throw new Error("disk"); }, keys: async () => [], remove: async () => {} };
  assert.equal((await handleCapture({ source: "footer", email: "a@example.org" }, "ip", { store: () => broken })).status, 502);
});

test("polingual signups merge languages on repeat submits", async () => {
  const { dir, store } = await stores();
  await handleCapture({ source: "polingual", email: "lev@example.org", speaks: "English" }, "ip", { store, now: () => NOW });
  await handleCapture({ source: "polingual", email: "lev@example.org", learning: "Russian" }, "ip", { store, now: () => NOW });
  const e = await store("polingual").read(emailKey("lev@example.org"));
  assert.equal(e?.speaks, "English");
  assert.equal(e?.learning, "Russian");
  assert.equal(e?.signups, 2);
  await rm(dir, { recursive: true, force: true });
});

test("withTimeout rejects after the limit", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10), /timed out/);
  assert.equal(await withTimeout(Promise.resolve(4), 10), 4);
});

test("legs are env-gated and carry no email", async () => {
  assert.equal(analyticsLeg({}, async () => {}), undefined);
  assert.equal(analyticsLeg({ VERCEL_ENV: "preview", CAPTURE_ANALYTICS: "0" }, async () => {}), undefined);
  assert.equal(slackLeg({}), undefined);
  assert.equal(slackLeg({ CAPTURE_SLACK_WEBHOOK_URL: "https://evil.example/hook" }), undefined);
  const rec = { email: "ada@example.org", source: "polingual" as const, persona: null, speaks: "English", learning: "Russian", interest: null, opt_ins: { release_notes: false, whats_new_daily: false }, at: NOW };
  assert.ok(!JSON.stringify(captureEventProps(rec)).includes("ada@"));
  assert.ok(!slackText(rec).includes("ada@"));
  const calls: string[] = [];
  const leg = slackLeg({ CAPTURE_SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/x" }, async (_u, init) => { calls.push(String(init.body)); return new Response("ok"); });
  await leg!(rec);
  assert.match(calls[0], /New polingual signup/);
  const tracked: string[] = [];
  await analyticsLeg({ VERCEL_ENV: "production" }, async (ev) => { tracked.push(ev); })!(rec);
  assert.deepEqual(tracked, ["capture"]);
});

test("CORS allows polingual.com and localhost in dev only", () => {
  assert.equal(allowedOrigin("https://polingual.com", {}), "https://polingual.com");
  assert.equal(allowedOrigin("https://evil.example", {}), null);
  assert.equal(allowedOrigin("http://localhost:3001", {}), "http://localhost:3001");
  assert.equal(allowedOrigin("http://localhost:3001", { VERCEL_ENV: "production" }), null);
  assert.equal(allowedOrigin(null, {}), null);
});

test("clients post to /api/capture with their source", () => {
  assert.match(read("src/app/download/DownloadFlowV3.tsx"), /fetch\("\/api\/capture"[\s\S]*source: "download"/);
  assert.match(read("src/app/sign-in/WaitlistForm.tsx"), /fetch\("\/api\/capture"[\s\S]*source: "wall"/);
  assert.match(read("polingual/src/app/signup.tsx"), /CAPTURE_URL[\s\S]*source: "polingual"/);
  assert.ok(!fs.existsSync(path.join(root, "polingual/src/app/api/signup/route.ts")));
});

test("Start learning is the primary action and Download is secondary", () => {
  assert.equal(START_LEARNING_HREF, "/sign-in?next=/learn");
  const hero = read("src/components/Presentation.tsx");
  assert.ok(hero.indexOf("Start learning") < hero.indexOf("Download Bucket"));
  assert.match(hero, /event="start_learning_click"/);
  const header = read("src/components/HeaderV3.tsx");
  assert.match(header, /bg-\[color:var\(--gold\)\][\s\S]*Start learning/);
  assert.match(read("src/components/download/DownloadExperience.tsx"), /data-start-learning/);
});

test("funnel events cover the four plan events", () => {
  for (const e of ["open_research_os", "sign_in_complete", "download_click", "download_complete"]) assert.ok((FUNNEL_EVENTS as readonly string[]).includes(e), e);
  assert.match(read("src/app/sign-in/SignInForm.tsx"), /trackFunnel\("sign_in_complete"/);
});
