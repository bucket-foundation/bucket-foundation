import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import {
  RATE,
  parseTranslationReport,
  rateKeys,
  recordTranslationReport,
  type TranslationReportRow,
  type TranslationReportStore,
} from "../src/lib/academy/translation-report";
import { handleTranslationReport } from "../src/app/api/academy/translation-report/handler";

const USER = "11111111-1111-1111-1111-111111111111";
const DEVICE = "22222222-2222-4222-8222-222222222222";

function memoryStore(): TranslationReportStore & { rows: TranslationReportRow[]; hits: Map<string, number> } {
  const rows: TranslationReportRow[] = [];
  const hits = new Map<string, number>();
  return {
    rows,
    hits,
    exists: async (id) => rows.some((r) => r.id === id),
    hit: async (key, limit, windowSeconds) => {
      const n = (hits.get(key) ?? 0) + 1;
      hits.set(key, n);
      return n <= limit ? 0 : Math.floor(windowSeconds / 2);
    },
    insert: async (row) => {
      if (rows.some((r) => r.id === row.id)) return "duplicate";
      rows.push(row);
      return "recorded";
    },
  };
}

function body(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: randomUUID(), lang: "zh", root: "en", item_id: "w:water", text: "水", shown: "fire", reason: "meaning", device_id: DEVICE, context: "study:translate", ...over };
}

function post(b: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/academy/translation-report", {
    method: "POST",
    body: typeof b === "string" ? b : JSON.stringify(b),
    headers: { "x-real-ip": "203.0.113.9", ...headers },
  });
}

test("parse keeps a full report and trims the free text", () => {
  const p = parseTranslationReport(body({ suggestion: "  water  " }));
  assert.equal(p.ok, true);
  if (p.ok) {
    assert.equal(p.value.suggestion, "water");
    assert.equal(p.value.itemId, "w:water");
    assert.equal(p.value.deviceId, DEVICE);
  }
});

test("parse refuses bad reasons, langs, ids and missing subjects", () => {
  assert.deepEqual(parseTranslationReport(body({ reason: "rude" })), { ok: false, error: "bad_reason" });
  assert.deepEqual(parseTranslationReport(body({ lang: "Chinese" })), { ok: false, error: "bad_lang" });
  assert.deepEqual(parseTranslationReport(body({ id: "x" })), { ok: false, error: "bad_id" });
  assert.deepEqual(parseTranslationReport(body({ item_id: null, text: "  " })), { ok: false, error: "missing_item" });
  assert.deepEqual(parseTranslationReport(body({ shown: "" })), { ok: false, error: "missing_shown" });
  assert.deepEqual(parseTranslationReport(body({ suggestion: "x".repeat(401) })), { ok: false, error: "too_long" });
  assert.deepEqual(parseTranslationReport(body({ device_id: "abc" })), { ok: false, error: "bad_device" });
  assert.deepEqual(parseTranslationReport(body({ context: "DROP TABLE" })), { ok: false, error: "bad_context" });
  assert.deepEqual(parseTranslationReport([]), { ok: false, error: "bad_request" });
});

test("every reason the app offers parses", () => {
  for (const reason of ["meaning", "spelling", "sound", "script"]) assert.equal(parseTranslationReport(body({ reason })).ok, true, reason);
});

test("a text-only report from the translate box is accepted", () => {
  const p = parseTranslationReport(body({ item_id: undefined, text: "good morning", context: "translate:sentence" }));
  assert.equal(p.ok, true);
});

test("signed-in reports key the limit on the user, anonymous ones on the device", () => {
  const p = parseTranslationReport(body());
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.deepEqual(rateKeys(p.value, { userId: USER, ip: null }).map((k) => k.key), [`tr:u:${USER}`]);
  assert.deepEqual(rateKeys(p.value, { userId: USER, ip: "1.2.3.4" }).map((k) => k.key), [`tr:u:${USER}`, "tr:ip:1.2.3.4"]);
  assert.deepEqual(rateKeys(p.value, { userId: null, ip: "1.2.3.4" }).map((k) => k.key), [`tr:d:${DEVICE}`, "tr:ip:1.2.3.4", "tr:anon"]);
});

test("anonymous reports with no known ip share one ip bucket and the global cap", () => {
  const p = parseTranslationReport(body());
  assert.ok(p.ok);
  if (!p.ok) return;
  for (const ip of [null, "unknown"]) assert.deepEqual(rateKeys(p.value, { userId: null, ip }).map((k) => k.key), [`tr:d:${DEVICE}`, "tr:ip:unknown", "tr:anon"]);
});

test("rotating device ids from one ip still hits the ip cap", async () => {
  const store = memoryStore();
  const deps = { verifyUser: async () => null, store: () => store };
  for (let i = 0; i < RATE.ip.limit; i++) assert.equal((await handleTranslationReport(post(body({ device_id: randomUUID() }), { "x-real-ip": "unknown" }), deps)).status, 200);
  assert.equal((await handleTranslationReport(post(body({ device_id: randomUUID() }), { "x-real-ip": "unknown" }), deps)).status, 429);
});

test("a duplicate retry does not spend rate quota", async () => {
  const store = memoryStore();
  const p = parseTranslationReport(body());
  assert.ok(p.ok);
  if (!p.ok) return;
  await recordTranslationReport(store, p.value, { userId: null, ip: "1.2.3.4" });
  for (let i = 0; i < 5; i++) assert.deepEqual(await recordTranslationReport(store, p.value, { userId: null, ip: "1.2.3.4" }), { outcome: "duplicate" });
  assert.equal(store.hits.get(`tr:d:${DEVICE}`), 1);
});

test("a retried report with the same id is stored once", async () => {
  const store = memoryStore();
  const p = parseTranslationReport(body());
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.deepEqual(await recordTranslationReport(store, p.value, { userId: null, ip: null }), { outcome: "recorded" });
  assert.deepEqual(await recordTranslationReport(store, p.value, { userId: null, ip: null }), { outcome: "duplicate" });
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0].user_id, null);
});

test("an anonymous report without a device id never reaches the store", async () => {
  const store = memoryStore();
  const p = parseTranslationReport(body({ device_id: null }));
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.deepEqual(await recordTranslationReport(store, p.value, { userId: null, ip: null }), { outcome: "anonymous_needs_device" });
  assert.equal(store.rows.length, 0);
});

test("the route stores an anonymous report and answers 200", async () => {
  const store = memoryStore();
  const res = await handleTranslationReport(post(body()), { verifyUser: async () => null, store: () => store });
  assert.equal(res.status, 200);
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0].device_id, DEVICE);
});

test("the route ties a signed-in report to the user", async () => {
  const store = memoryStore();
  const res = await handleTranslationReport(post(body(), { authorization: "Bearer tok" }), { verifyUser: async () => ({ id: USER, email: null }), store: () => store });
  assert.equal(res.status, 200);
  assert.equal(store.rows[0].user_id, USER);
});

test("the route refuses a bad bearer instead of filing it anonymously", async () => {
  const store = memoryStore();
  const res = await handleTranslationReport(post(body(), { authorization: "Bearer stale" }), { verifyUser: async () => null, store: () => store });
  assert.equal(res.status, 401);
  assert.equal(store.rows.length, 0);
});

test("the route rate limits a device past its hourly cap", async () => {
  const store = memoryStore();
  const deps = { verifyUser: async () => null, store: () => store };
  for (let i = 0; i < RATE.device.limit; i++) assert.equal((await handleTranslationReport(post(body()), deps)).status, 200);
  const res = await handleTranslationReport(post(body()), deps);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), String(Math.floor(RATE.device.windowSeconds / 2)));
  assert.equal(store.rows.length, RATE.device.limit);
});

test("the route answers 400 on junk, 413 on a huge body and 503 with no store", async () => {
  const store = memoryStore();
  assert.equal((await handleTranslationReport(post("{nope"), { verifyUser: async () => null, store: () => store })).status, 400);
  assert.equal((await handleTranslationReport(post(body({ device_id: null })), { verifyUser: async () => null, store: () => store })).status, 400);
  assert.equal((await handleTranslationReport(post("x".repeat(5000)), { verifyUser: async () => null, store: () => store })).status, 413);
  assert.equal((await handleTranslationReport(post(body()), { verifyUser: async () => null, store: () => null })).status, 503);
});

test("the migration seals the table and keeps reports past account deletion", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261108000000_translation_reports.sql"), "utf8");
  assert.match(sql, /alter table bucket\.translation_reports enable row level security/);
  assert.match(sql, /alter table bucket\.translation_reports force row level security/);
  assert.match(sql, /revoke all on bucket\.translation_reports from public, anon, authenticated/);
  assert.match(sql, /user_id\s+uuid\s+references auth\.users \(id\) on delete set null/);
  assert.match(sql, /reason in \('meaning', 'spelling', 'sound', 'script'\)/);
  assert.doesNotMatch(sql, /grant [^;]* to (anon|authenticated)/);
  assert.doesNotMatch(sql, /cascade/);
  assert.match(sql, /function bucket\.purge_translation_reports\(\)/);
  assert.match(sql, /resolved_at is not null or created_at < now\(\) - interval '180 days'/);
  assert.match(sql, /grant execute on function bucket\.purge_translation_reports\(\) to service_role/);
});

test("the purge cron runs nightly", () => {
  const crons = (JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons: { path: string }[] }).crons;
  assert.ok(crons.some((c) => c.path === "/api/cron/translation-report-purge"));
});
