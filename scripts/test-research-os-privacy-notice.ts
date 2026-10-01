import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { COLLECTED, DOWNLOAD_STORED, EVENTS, PRIVACY_DRAFT } from "../src/lib/privacy-notice";
import { CONSENT_VERSION, RETENTION_DAYS, RETENTION_MONTHS, parseDownload } from "../src/lib/download/core";
import { EMAIL_COOLDOWN_MS, LINK_REUSE_MS, LINK_TTL_MS } from "../src/lib/download/notify";
import { MARK_MAX_AGE_MS } from "../src/lib/download/marks";
import { mergeEntry } from "../src/lib/waitlist/core";

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
