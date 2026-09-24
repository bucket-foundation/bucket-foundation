import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { COLLECTED, EVENTS, PRIVACY_DRAFT } from "../src/lib/privacy-notice";

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
