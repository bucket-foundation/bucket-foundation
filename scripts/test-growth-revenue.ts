import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { buildRevenueReport, parseRevenue, REVENUE_PRODUCTS } from "../src/lib/growth/revenue";
import { parseSnapshot, type GrowthSnapshot } from "../src/lib/growth/snapshot";
import type { SnapshotStore } from "../src/lib/growth/store";
import { handleGrowthReport, handleGrowthSnapshot, type GrowthDeps } from "../src/app/api/admin/growth/handler";
import { memory, NOW } from "./beta-memory-store";

const KEY = "k".repeat(24);
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "../tests/fixtures/growth", name), "utf8"));
const SNAPSHOT = read("snapshot.json");
const REVENUE = read("revenue.json");

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/growth", { method, headers: { authorization: `Bearer ${KEY}` }, body: body === undefined ? undefined : JSON.stringify(body) });
}

function deps(): GrowthDeps & { saved: GrowthSnapshot[] } {
  const saved: GrowthSnapshot[] = [];
  const store: SnapshotStore = { latest: async () => saved[saved.length - 1] ?? null, save: async (s) => void saved.push(s) };
  return { saved, adminKey: () => KEY, beta: () => memory(), snapshots: () => store, waitlist: async () => [], now: () => NOW };
}

test("revenue totals come from the fixture reports", () => {
  const rev = parseRevenue(REVENUE);
  assert.ok(rev);
  const r = buildRevenueReport(rev);
  assert.deepEqual(r.proceeds, [{ currency: "EUR", amount: 7.2 }, { currency: "USD", amount: 76.46 }]);
  assert.deepEqual([r.units, r.appUnits, r.activeSubscriptions, r.activeAsOf], [5, 15, 17, "2026-11-15"]);
  assert.deepEqual([r.trialsStarted, r.trialsConverted, r.offerCodeRedemptions], [6, 2, 3]);
  assert.deepEqual(r.events?.[0], { event: "Start Introductory Offer", quantity: 6 });
});

test("each product row shows its own figures and absent products stay empty", () => {
  const r = buildRevenueReport(parseRevenue(REVENUE));
  assert.deepEqual(r.products.map((p) => p.sku), [...REVENUE_PRODUCTS]);
  const [monthly, yearly, family, lifetime] = r.products;
  assert.deepEqual([monthly.units, monthly.active, monthly.trial, monthly.offerCode], [4, 3, 0, 0]);
  assert.deepEqual(monthly.proceeds, [{ currency: "EUR", amount: 7.2 }, { currency: "USD", amount: 25.47 }]);
  assert.deepEqual([yearly.units, yearly.active, yearly.trial, yearly.offerCode], [1, 14, 7, 2]);
  for (const p of [family, lifetime]) {
    assert.equal(p.inAppStoreConnect, false);
    assert.deepEqual([p.units, p.proceeds, p.active, p.trial, p.offerCode], [null, null, null, null, null]);
  }
});

test("daily rows list newest first and a day Apple reports as empty counts zero", () => {
  const r = buildRevenueReport(parseRevenue(REVENUE));
  assert.deepEqual(r.daily.map((d) => d.day), ["2026-11-15", "2026-11-14"]);
  assert.deepEqual(r.daily[0].units, { "com.polingual.monthly": 4, "com.polingual.yearly": 1 });
  assert.deepEqual([r.daily[0].appUnits, r.daily[0].trialsStarted, r.daily[0].trialsConverted, r.daily[0].offerCodeRedemptions], [15, 6, 2, 3]);
  assert.deepEqual([r.daily[1].appUnits, r.daily[1].units, r.daily[1].proceeds, r.daily[1].trialsStarted], [0, {}, [], 0]);
});

test("figures the API did not return stay null", () => {
  for (const rev of [null, undefined, parseRevenue({ days: 30, known: ["com.polingual.monthly"], sales: null, subscriptions: null, events: null, notes: ["ASC_VENDOR_NUMBER is not set"] })]) {
    const r = buildRevenueReport(rev);
    assert.deepEqual([r.proceeds, r.units, r.appUnits, r.activeSubscriptions, r.trialsStarted, r.trialsConverted, r.offerCodeRedemptions, r.events], [null, null, null, null, null, null, null, null]);
    assert.deepEqual(r.daily, []);
    assert.ok(r.products.every((p) => p.units === null && p.proceeds === null && p.active === null));
  }
  const partial = buildRevenueReport(parseRevenue({ ...REVENUE, events: null }));
  assert.equal(partial.trialsStarted, null);
  assert.equal(partial.daily[0].trialsStarted, null);
  assert.equal(partial.units, 5);
  const noted = buildRevenueReport(parseRevenue({ days: 30, known: [], notes: ["sales: HTTP 403"] }));
  assert.deepEqual(noted.notes, ["sales: HTTP 403"]);
});

test("parseRevenue refuses malformed rows", () => {
  assert.equal(parseRevenue(undefined), null);
  assert.equal(parseRevenue({ ...REVENUE, days: 0 }), undefined);
  assert.equal(parseRevenue({ ...REVENUE, sales: { days: ["soon"], rows: [] } }), undefined);
  assert.equal(parseRevenue({ ...REVENUE, sales: { days: [], rows: [{ ...REVENUE.sales.rows[0], units: "3" }] } }), undefined);
  assert.equal(parseRevenue({ ...REVENUE, sales: { days: [], rows: [{ ...REVENUE.sales.rows[0], currency: "dollars" }] } }), undefined);
  assert.equal(parseRevenue({ ...REVENUE, subscriptions: { day: "2026-11-15", rows: [{ sku: "com.polingual.yearly", standard: -1 }] } }), undefined);
  assert.equal(parseRevenue({ ...REVENUE, events: { days: [], rows: [{ day: "2026-11-15", sku: "x y", event: "Cancel", offer: "", quantity: 1 }] } }), undefined);
  assert.equal(parseSnapshot({ ...SNAPSHOT, revenue: { days: 30 } }).ok, false);
});

test("the growth handler stores revenue with the snapshot and reports it", async () => {
  const d = deps();
  const before = await (await handleGrowthReport(req("GET"), d)).json();
  assert.equal(before.revenue.proceeds, null);
  assert.equal(before.revenue.products.length, 4);
  assert.equal((await handleGrowthSnapshot(req("POST", { ...SNAPSHOT, revenue: { days: 30 } }), d)).status, 400);
  assert.equal((await handleGrowthSnapshot(req("POST", { ...SNAPSHOT, revenue: REVENUE }), d)).status, 200);
  assert.deepEqual(d.saved[0].revenue, REVENUE);
  const body = await (await handleGrowthReport(req("GET"), d)).json();
  assert.equal(body.revenue.activeSubscriptions, 17);
  assert.deepEqual(body.revenue.proceeds, [{ currency: "EUR", amount: 7.2 }, { currency: "USD", amount: 76.46 }]);
  assert.equal(body.funnel.length, 5);
  assert.equal((await handleGrowthSnapshot(req("POST", SNAPSHOT), d)).status, 200);
  const old = await (await handleGrowthReport(req("GET"), d)).json();
  assert.equal(old.revenue.proceeds, null);
});

test("polingual.com/admin and admin.polingual.com redirect to the growth report", async () => {
  const config = require("../polingual/next.config.js");
  const redirects: { source: string; destination: string; permanent: boolean; has?: { type: string; value: string }[] }[] = await config.redirects();
  const admin = redirects.find((r) => r.source === "/admin");
  assert.deepEqual(admin, { source: "/admin", destination: "https://www.bucket.foundation/admin/growth", permanent: false });
  const host = redirects.find((r) => r.has?.some((h) => h.type === "host" && h.value === "admin.polingual.com"));
  assert.equal(host?.destination, "https://www.bucket.foundation/admin/growth");
  assert.equal(host?.permanent, false);
});
