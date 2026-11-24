import { test } from "node:test";
import assert from "node:assert/strict";
import { HEARD_ABOUT, ONBOARDING_SCREENS } from "./funnel-steps";
import { funnelBody } from "./funnel";
import { heardAboutDue, HEARD_KEY, HEARD_LABELS } from "./heard-about";

function store(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test("the heard-about question shows until answered", () => {
  assert.equal(heardAboutDue(store()), true);
  assert.equal(heardAboutDue(store({ [HEARD_KEY]: "tiktok" })), false);
  assert.equal(heardAboutDue(null), true);
  for (const a of HEARD_ABOUT) assert.ok(HEARD_LABELS[a]);
});

test("onboarding screens send their name and the answer is sent once", () => {
  const s = store();
  const ctx = { store: s, search: "", path: "/app/new", lang: "en", make: () => "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12" };
  for (const screen of ONBOARDING_SCREENS) {
    const body = JSON.parse(funnelBody("onboarding_view", { ...ctx, detail: screen })!);
    assert.equal(body.events[0].detail, screen);
  }
  assert.equal(JSON.parse(funnelBody("heard_about", { ...ctx, detail: "tiktok" })!).events[0].detail, "tiktok");
  assert.equal(funnelBody("heard_about", { ...ctx, detail: "reddit" }), null);
});
