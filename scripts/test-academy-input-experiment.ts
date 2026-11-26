import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ARM_IDS, assignArm, canFill, experimentMix, experimentOn, fnv1a32, stratum } from "../src/lib/academy/input-experiment";
import { planInputMix } from "../src/lib/academy/input-mix";

const v = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/input-experiment-vectors.json"), "utf8"));

test("the experiment flag is off unless set to 1", () => {
  assert.equal(experimentOn(undefined), false);
  assert.equal(experimentOn(""), false);
  assert.equal(experimentOn("true"), false);
  assert.equal(experimentOn("1"), true);
});

test("hashes, assignments, fill checks and mixes match the golden vectors", () => {
  for (const h of v.hashes) assert.equal(fnv1a32(h.key), h.hash, h.key);
  for (const a of v.assign) assert.equal(assignArm(a.key, a.tier), a.arm, `${a.key}/${a.tier}`);
  for (const f of v.fill) assert.equal(canFill(f.cards, f.seconds), f.fill);
  for (const m of v.mixes) {
    const got = experimentMix(m.on, m.key, m.tier, m.cards, m.seconds);
    assert.equal(got.arm, m.arm);
    assert.equal(got.mix.target, m.target);
    assert.ok(Math.abs(got.mix.share - m.share) < 1e-9);
    assert.equal(got.mix.units, m.units);
    assert.deepEqual(got.mix.positions, m.positions);
  }
});

test("assignment is stable, stratified by tier band, and near balanced", () => {
  assert.equal(assignArm("k", 2), assignArm("k", 5));
  assert.equal(stratum(6), "to-a2");
  assert.equal(stratum(7), "past-a2");
  const n: Record<string, number> = {};
  for (let i = 0; i < 30000; i++) n[assignArm(`u${i}`, i % 12)] = (n[assignArm(`u${i}`, i % 12)] ?? 0) + 1;
  for (const a of ARM_IDS) assert.ok(Math.abs(n[a] / 30000 - 1 / 3) < 0.01, a);
});

test("off, the mix and arm equal the default plan", () => {
  const seconds = [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];
  assert.deepEqual(experimentMix(false, "u1", 2, 10, seconds), { mix: planInputMix(2, 10, seconds), arm: null });
  assert.deepEqual(planInputMix(2, 10, seconds, undefined), planInputMix(2, 10, seconds));
});
