import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accessStep, funnelBody } from "./funnel";
import { FUNNEL_STEPS } from "./funnel-steps";
import { parseEvents } from "./events";

const V = "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12";

function mem(seed: Record<string, string> = {}) {
  const m = new Map(Object.entries(seed));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

const ctx = (store: ReturnType<typeof mem>, search = "") => ({ store, search, path: "/app", lang: "en", make: () => V });

test("funnelBody reuses the landing visitor and stored utm", () => {
  const store = mem({ "pl.vid": V, "pl.utm": JSON.stringify({ s: "easylanguages", m: "creator", c: "nov" }) });
  const body = JSON.parse(funnelBody("paywall_view", ctx(store))!);
  assert.equal(body.visitor, V);
  assert.deepEqual(body.events[0], { name: "paywall_view", path: "/app", utm_source: "easylanguages", utm_medium: "creator", utm_campaign: "nov", lang: "en" });
});

test("funnelBody takes fresh utm from the url and makes a visitor id", () => {
  const store = mem();
  const body = JSON.parse(funnelBody("paywall_view", ctx(store, "?utm_source=asa"))!);
  assert.equal(body.visitor, V);
  assert.equal(body.events[0].utm_source, "asa");
  assert.equal(store.m.get("pl.vid"), V);
});

test("one-time steps fire once per visitor, paywall views repeat", () => {
  const store = mem();
  for (const step of ["signup", "first_lesson", "trial_start", "paid"] as const) {
    assert.ok(funnelBody(step, ctx(store)));
    assert.equal(funnelBody(step, ctx(store)), null);
  }
  assert.ok(funnelBody("paywall_view", ctx(store)));
  assert.ok(funnelBody("paywall_view", ctx(store)));
});

test("funnelBody survives missing storage and bad stored utm", () => {
  assert.ok(funnelBody("signup", { ...ctx(mem()), store: null }));
  const body = JSON.parse(funnelBody("paywall_view", ctx(mem({ "pl.utm": "{" })))!);
  assert.equal(body.events[0].utm_source, null);
});

test("accessStep maps subscription access to trial or paid", () => {
  assert.equal(accessStep({ status: "open", trial: true }), "trial_start");
  assert.equal(accessStep({ status: "open", trial: false, productId: "com.polingual.yearly" }), "paid");
  assert.equal(accessStep({ status: "open", trial: false, productId: "web.polingual.monthly" }), "paid");
  assert.equal(accessStep({ status: "locked" }), null);
  assert.equal(accessStep({ status: "unknown" }), null);
});

test("granted access never counts as paid", () => {
  for (const productId of ["web.polingual.gift.yearly", "web.polingual.founding", "web.polingual.comp", "web.polingual.membership", null]) {
    assert.equal(accessStep({ status: "open", trial: false, productId }), null, String(productId));
  }
});

test("the dedupe migration makes once-only steps unique per visitor and inserts idempotent", () => {
  const sql = readFileSync(join(__dirname, "../../../supabase/migrations/20261123200000_polingual_funnel_once.sql"), "utf8");
  assert.match(sql, /create unique index if not exists polingual_web_events_once\s+on public\.polingual_web_events \(visitor, name\)/);
  for (const s of ["signup", "first_lesson", "trial_start", "paid"]) assert.ok(sql.includes(`'${s}'`), s);
  assert.match(sql, /on conflict \(visitor, name\) where name in \([^)]*\) do nothing/);
});

test("the events api accepts every funnel step", () => {
  const out = parseEvents({ visitor: V, events: FUNNEL_STEPS.map((name) => ({ name })) })!;
  assert.deepEqual(out.map((e) => e.name), [...FUNNEL_STEPS]);
});

test("the landing page sends landing_view and the migration allows every step", () => {
  assert.match(readFileSync(join(__dirname, "../../public/d8/beta.js"), "utf8"), /ev\("landing_view"\)/);
  const sql = readFileSync(join(__dirname, "../../../supabase/migrations/20261123120000_polingual_funnel_events.sql"), "utf8");
  for (const s of FUNNEL_STEPS) assert.ok(sql.split(`'${s}'`).length >= 3, s);
});
