import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ARM_IDS, assignArm, canFill, enrolmentKey, experimentMix, experimentOn, fnv1a32, heldOutWords, mayTakePart, parseEnrolment, type Enrolment } from "../src/lib/academy/input-experiment";
import { planInputMix } from "../src/lib/academy/input-mix";

const v = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/input-experiment-vectors.json"), "utf8"));
const yes = { flag: true, uploadOpen: true, disclosed: true, optedOut: false };
const full = [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];

test("the experiment flag is off unless set to 1", () => {
  assert.equal(experimentOn(undefined), false);
  assert.equal(experimentOn(""), false);
  assert.equal(experimentOn("true"), false);
  assert.equal(experimentOn("1"), true);
});

test("hashes, keys, assignments, fill checks and mixes match the golden vectors", () => {
  for (const h of v.hashes) assert.equal(fnv1a32(h.key), h.hash, h.key);
  for (const k of v.keysFor) assert.equal(enrolmentKey(k.account, k.device), k.key);
  for (const a of v.assign) assert.equal(assignArm(a.key), a.arm, a.key);
  for (const f of v.fill) assert.equal(canFill(f.cards, f.seconds), f.fill);
  for (const m of v.mixes) {
    const got = experimentMix(m.consent, m.enrolment, m.key, m.tier, m.cards, m.seconds, m.now);
    assert.equal(got.arm, m.arm);
    assert.deepEqual(got.enrolment, m.enrolment_out);
    assert.equal(got.mix.target, m.target);
    assert.ok(Math.abs(got.mix.share - m.share) < 1e-9);
    assert.equal(got.mix.units, m.units);
    assert.deepEqual(got.mix.positions, m.positions);
  }
});

test("taking part needs the flag, upload consent and age gate, the disclosure, and no opt-out", () => {
  assert.equal(mayTakePart(yes), true);
  for (const k of ["flag", "uploadOpen", "disclosed"] as const) assert.equal(mayTakePart({ ...yes, [k]: false }), false, k);
  assert.equal(mayTakePart({ ...yes, optedOut: true }), false);
});

test("an enrolment freezes the arm and stratum across tier changes", () => {
  const first = experimentMix(yes, null, "acct:u1", 2, 10, full, 1);
  const e = first.enrolment!;
  assert.equal(e.stratum, "to-a2");
  assert.equal(e.arm, assignArm("acct:u1"));
  const later = experimentMix(yes, e, "acct:u1", 11, 10, full, 2);
  assert.equal(later.arm, e.arm);
  assert.deepEqual(later.enrolment, e);
  assert.deepEqual(parseEnrolment(JSON.parse(JSON.stringify(e))), e);
  assert.equal(parseEnrolment({ ...e, arm: "s60" }), null);
  assert.equal(parseEnrolment({ ...e, experiment: "old" }), null);
});

test("an unfilled first session does not enrol, and an opt-out runs the default mix", () => {
  assert.equal(experimentMix(yes, null, "acct:u1", 2, 10, [60], 1).enrolment, null);
  const e: Enrolment = { experiment: "ci14-share-v1", key: "acct:u1", arm: "s90", stratum: "to-a2", at: 0 };
  const out = experimentMix({ ...yes, optedOut: true }, e, "acct:u1", 2, 10, full, 1);
  assert.equal(out.arm, null);
  assert.deepEqual(out.mix, planInputMix(2, 10, full));
});

test("assignment is near balanced", () => {
  const n: Record<string, number> = {};
  for (let i = 0; i < 30000; i++) {
    const a = assignArm(`acct:u${i}`);
    n[a] = (n[a] ?? 0) + 1;
  }
  for (const a of ARM_IDS) assert.ok(Math.abs(n[a] / 30000 - 1 / 3) < 0.01, a);
});

test("held-out words are the real words of both forms", () => {
  const forms = { A: [{ word: "casa", real: true }, { word: "basas", real: false }], B: [{ word: "perro", real: true }] };
  assert.deepEqual(Array.from(heldOutWords(forms)).sort(), ["casa", "perro"]);
  assert.equal(heldOutWords(null).size, 0);
});
