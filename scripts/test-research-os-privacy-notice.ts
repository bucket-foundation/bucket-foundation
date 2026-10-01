import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { COLLECTED, DOWNLOAD_STORED, EVENTS, PRIVACY_DRAFT, PROCESSORS } from "../src/lib/privacy-notice";
import { CONSENT_VERSION, RETENTION_DAYS, RETENTION_MONTHS, parseDownload } from "../src/lib/download/core";
import { EMAIL_COOLDOWN_MS, LINK_REUSE_MS, LINK_TTL_MS } from "../src/lib/download/notify";
import { MARK_MAX_AGE_MS } from "../src/lib/download/marks";
import { mergeEntry } from "../src/lib/waitlist/core";
import { handleDownload } from "../src/lib/download/handler";
import { getOptOutStore, subscriberId } from "../src/lib/whats-new-email/unsubscribe";

const ROOT = path.join(__dirname, "..");
const PLAN = path.join(ROOT, "learning/research-os/LAUNCH-PLAN.md");
const PAGE = path.join(ROOT, "src/app/privacy/page.tsx");

function plannedEvents(): string[] {
  const plan = fs.readFileSync(PLAN, "utf8");
  const start = plan.indexOf("| Event | Written by |");
  assert.ok(start >= 0, "the plan's event table moved");
  const rows = plan.slice(start).split("\n").slice(2);
  const names: string[] = [];
  for (const row of rows) {
    if (!row.startsWith("|")) break;
    const m = /^\|\s*`([a-z_]+)`/.exec(row);
    if (m) names.push(m[1]);
  }
  return names;
}

test("the notice names every product event the launch plan records", () => {
  const planned = plannedEvents();
  assert.ok(planned.length >= 4, `the plan's event table parsed to ${planned.length} rows`);
  assert.deepEqual(EVENTS.map((e) => e.name).sort(), planned.sort());
});

test("the notice covers what the plan's measurement and consent sections collect", () => {
  assert.deepEqual(COLLECTED.map((c) => c.what), ["Email", "Age band", "Progress", "Public Mastery Profile", "Product events"]);
  for (const c of COLLECTED) assert.ok(c.detail.trim() && c.why.trim(), `${c.what} says what and why`);
});

test("a draft notice says so on the page and stays out of search", () => {
  const page = fs.readFileSync(PAGE, "utf8");
  assert.match(page, /\{PRIVACY_DRAFT && \(/);
  assert.match(page, /robots: \{ index: !PRIVACY_DRAFT, follow: !PRIVACY_DRAFT \}/);
  assert.equal(typeof PRIVACY_DRAFT, "boolean");
});

test("the notice is final while /download collects email", () => {
  assert.equal(PRIVACY_DRAFT, false);
});

test("the notice lists every field a download request stores", () => {
  const parsed = parseDownload({ email: "ada@example.org", name: "Ada", role: "researcher", research: "number theory", platform: "linux-x64", release_notes: true, whats_new_daily: true, consent: true });
  assert.ok(parsed.ok);
  const entry = mergeEntry(null, parsed.request.input, "2026-09-30T00:00:00.000Z");
  assert.equal(entry.consent_version, CONSENT_VERSION);
  assert.deepEqual(DOWNLOAD_STORED.flatMap((d) => d.fields).sort(), Object.keys(entry).sort());
  for (const d of DOWNLOAD_STORED) assert.ok(d.detail.trim(), `${d.what} says what is stored`);
});

test("the page states the link, cooldown, sweep and retention windows the code uses", () => {
  const page = fs.readFileSync(PAGE, "utf8");
  assert.equal(LINK_TTL_MS, 24 * 3_600_000);
  assert.match(page, /works for 24 hours/);
  assert.equal(LINK_REUSE_MS, 10 * 60_000);
  assert.match(page, /10 minutes after its first use/);
  assert.equal(EMAIL_COOLDOWN_MS, 3_600_000);
  assert.match(page, /one link an hour/);
  assert.equal(MARK_MAX_AGE_MS, 25 * 3_600_000);
  assert.match(page, /older than 25 hours/);
  assert.equal(RETENTION_DAYS, 365);
  assert.equal(RETENTION_MONTHS, 12);
  assert.match(page, /\{RETENTION_MONTHS\} months after your last request/);
  assert.match(page, /\{CONSENT_VERSION\}/);
});

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("the page states the five a minute limit the download route enforces", () => {
  const route = read("src/app/api/download/route.ts");
  assert.match(route, /rateLimiter\(5, 60_000\)/);
  assert.match(route, /sharedRateLimiter\(marks, 5, 60_000\)/);
  assert.match(read("src/app/privacy/page.tsx"), /allow five a minute/);
});

test("a spam-trap request is stored apart and gets no email, as the page says", async () => {
  assert.match(read("src/app/api/download/route.ts"), /suspect \? "downloads\/suspect" : "downloads"/);
  const saved: { suspect: boolean; keys: string[] }[] = [];
  let notified = 0;
  const store = (suspect: boolean) => ({
    kind: "file" as const,
    prefix: "",
    read: async () => null,
    write: async (_k: string, e: object) => void saved.push({ suspect, keys: Object.keys(e) }),
    keys: async () => [],
    remove: async () => {},
  });
  const notify = async () => {
    notified++;
    return "sent" as const;
  };
  const body = { email: "ada@example.org", name: "Ada", consent: true };
  await handleDownload({ ...body, website: "spam" }, "ip", { store, notify });
  await handleDownload(body, "ip", { store, notify });
  assert.deepEqual(saved.map((s) => s.suspect), [true, false]);
  assert.deepEqual(saved[0].keys.sort(), saved[1].keys.sort());
  assert.equal(notified, 1);
  assert.match(read("src/app/privacy/page.tsx"), /hidden spam-trap field is stored apart, with the same fields, and gets no email/);
});

test("the unsubscribe record is a keyed hash that the purge and deletion paths leave in place", () => {
  const id = subscriberId("ada@example.org", "s".repeat(32));
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.notEqual(id, subscriberId("ada@example.org", "t".repeat(32)));
  assert.ok(getOptOutStore({}));
  assert.match(read("src/lib/whats-new-email/unsubscribe.ts"), /whats-new-\$\{part\}\//);
  for (const rel of ["src/app/api/cron/download-retention/route.ts", "src/app/api/download/route.ts", "src/lib/download/handler.ts"]) {
    assert.doesNotMatch(read(rel), /getOptOutStore|whats-new-optout|optout/, rel);
  }
  const page = read("src/app/privacy/page.tsx");
  assert.match(page, /keyed hash of your address and the time/);
  assert.match(page, /so the address stays unsubscribed/);
  assert.match(page, /daily deletion job and a deletion request both leave it in place/);
});

test("the processor list names only senders the code shows", () => {
  assert.deepEqual(PROCESSORS.map((p) => p.name), ["Supabase", "Vercel", "Resend", "Anthropic"]);
  for (const p of PROCESSORS) assert.doesNotMatch(p.role, /\bwill\b|name it here/);
});
