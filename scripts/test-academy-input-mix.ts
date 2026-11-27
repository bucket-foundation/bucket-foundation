import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { activeMs, fromYouTube, IDLE_MS, inputShare, inputTarget, isActive, planInputMix, realizedShare, roundedItems, youtubePlaying } from "../src/lib/academy/input-mix";
import { inputShare as fromSessionMix } from "../src/lib/academy/session-mix";

const V = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/input-mix-vectors.json"), "utf8"));
const close = (a: number, b: number, m: string) => assert.ok(Math.abs(a - b) < 1e-8, `${m}: ${a} vs ${b}`);

test("golden targets, shares, plans and rounding", () => {
  for (const t of V.target) assert.equal(inputTarget(t.tier), t.expect);
  for (const s of V.share) close(inputShare(s.tier, s.eligible, s.session), s.expect, "share");
  for (const p of V.plan) {
    const m = planInputMix(p.tier, p.cards, p.units);
    assert.deepEqual({ ...m, share: 0, plannedShare: 0 }, { ...p.expect, share: 0, plannedShare: 0 });
    close(m.share, p.expect.share, "share");
    close(m.plannedShare, p.expect.plannedShare, "planned");
  }
  for (const r of V.rounded) assert.equal(roundedItems(r.targetPermille, r.items), r.expect);
  assert.equal(fromSessionMix, inputShare);
});

for (const a of V.activity) test(`golden activity: ${a.name}`, () => assert.equal(activeMs(a.marks, a.end, a.needsPlayer), a.expect));

test("M1: the planned units sit within one item of the target seconds", () => {
  for (const tier of [0, 6, 7, 10]) for (let cards = 1; cards < 60; cards += 7) for (const avg of [30, 60, 120]) {
    const pool = Array.from({ length: 40 }, () => avg);
    const m = planInputMix(tier, cards, pool);
    const cardTime = cards * 12;
    const want = (m.share * cardTime) / (1 - m.share);
    if (m.units > 1 && m.units < Math.min(pool.length, cards)) assert.ok(Math.abs(m.units * avg - want) <= avg / 2 + 1e-9, `${tier}/${cards}/${avg}`);
    assert.ok(m.positions.every((p) => p >= 0 && p < cards));
    assert.equal(new Set(m.positions).size, m.positions.length);
  }
  for (let n = 0; n < 50; n++) for (const t of [600, 700]) assert.ok(Math.abs(roundedItems(t, n) * 1000 - t * n) <= 1000);
});

test("the share falls to zero when no unit qualifies and never passes the target", () => {
  assert.equal(planInputMix(2, 20, []).units, 0);
  for (const e of [10, 100, 1000, 10_000]) assert.ok(inputShare(8, e, e + 240) <= 0.6);
  assert.equal(realizedShare(30, 0), 0);
  close(realizedShare(30, 120), 0.25, "realized");
});

test("the YouTube state parser and the activity gate", () => {
  assert.equal(youtubePlaying('{"event":"onStateChange","info":1}'), true);
  assert.equal(youtubePlaying({ event: "onStateChange", info: 2 }), false);
  assert.equal(youtubePlaying('{"event":"infoDelivery","info":{"playerState":1}}'), true);
  assert.equal(youtubePlaying("nope"), null);
  assert.equal(fromYouTube("https://www.youtube-nocookie.com"), true);
  assert.equal(fromYouTube("https://www.youtube.com"), true);
  assert.equal(fromYouTube("https://evilyoutube.com"), false);
  assert.equal(fromYouTube("null"), false);
  assert.equal(isActive({ visible: true, focused: true, playing: false }, true), false);
  assert.equal(isActive({ visible: true, focused: true, playing: false }, false), true);
  assert.equal(isActive({ visible: true, focused: true, playing: false, idle: true }, false), false, "idle text stops the counter");
  assert.equal(isActive({ visible: true, focused: true, playing: true, idle: true }, true), true, "idle does not stop a playing video");
  assert.equal(IDLE_MS, 60_000);
});
