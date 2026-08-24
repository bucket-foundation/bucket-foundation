#!/usr/bin/env node
/* Bucket Academy, adaptive-core test (bkt-ecr / bkt-buk / bkt-uzx).
 * Runs the real biophysics corpus through the engine and asserts the three P1
 * mechanisms behave: encompassing graph is sane, FIRe reduces prerequisite
 * review burden, and the fused mastery model is (P x R, confidence band
 * back-compat 0..1). No deps; `node learning/app/test-adaptive.js`.
 */
"use strict";
const fs = require("fs");
const path = require("path");

// localStorage shim + globals (mirror the validate.sh test rig).
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};
const base = __dirname;
const corpus = JSON.parse(fs.readFileSync(path.join(base, "corpus", "biophysics.json"), "utf8"));
global.fetch = async () => ({ json: async () => corpus });

const Adaptive = require(path.join(base, "js", "adaptive.js"));
global.Adaptive = Adaptive;
require(path.join(base, "js", "fsrs.js"));
require(path.join(base, "js", "engine.js"));

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log("  ok  " + msg);
  else { console.error("  FAIL " + msg); failures++; }
}
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= (eps || 1e-9), msg + ` (${a} ~ ${b})`); }

(async () => {
  const E = new global.Engine();
  await E.load("x");
  const DAY = 86400000;

  /* ---------------- (1) Encompassing graph (bkt-ecr) ---------------- */
  console.log("\n[1] Two-layer graph (encompassing edges)");
  // Pick an atom that HAS prerequisites and whose prereqs themselves have some.
  const withReq = E.atoms.filter((a) => (a.requires || []).length > 0);
  ok(withReq.length > 0, "corpus has atoms with prerequisites");
  let multiHop = null;
  for (const a of withReq) {
    const edges = E.encompassingFor(a.id);
    if (edges.some((e) => e.dist >= 2)) { multiHop = a; break; }
  }
  ok(!!multiHop, "at least one atom encompasses a transitive (dist>=2) prerequisite");
  if (multiHop) {
    const edges = E.encompassingFor(multiHop.id);
    // direct prereqs must be present and weigh more than deeper ancestors
    const directIds = new Set(multiHop.requires);
    const direct = edges.filter((e) => directIds.has(e.id));
    ok(direct.every((e) => e.dist === 1), "direct prerequisites are at distance 1");
    const d1 = edges.find((e) => e.dist === 1);
    const d2 = edges.find((e) => e.dist === 2);
    if (d1 && d2) ok(d1.weight > d2.weight, "weight decays with graph distance (d1 > d2)");
    ok(edges.every((e) => e.weight > 0 && e.weight <= 1), "all weights in (0,1]");
    ok(edges.every((e) => e.id !== multiHop.id), "no self-encompassing edge");
    console.log(`      e.g. ${multiHop.id} encompasses ${edges.length} prereqs; top:`,
      edges.slice(0, 3).map((e) => `${e.id}@${e.weight}(d${e.dist})`).join(", "));
  }
  // No cycles / dangling: every edge target exists.
  let danglers = 0;
  E.atoms.forEach((a) => E.encompassingFor(a.id).forEach((e) => { if (!E.byId[e.id]) danglers++; }));
  ok(danglers === 0, "no encompassing edge points to a missing atom");

  /* ---------------- (2) FIRe (bkt-buk) ---------------- */
  console.log("\n[2] FIRe — fractional implicit repetition");
  // Fresh engine. Introduce a prereq + an advanced atom that encompasses it,
  // then review ONLY the advanced atom and check the prereq's due date pushed out.
  E.reset();
  // find advanced atom `adv` with a started prereq `pre` at the encompassing layer
  let adv = null, pre = null;
  for (const a of E.atoms) {
    const edges = E.encompassingFor(a.id);
    if (edges.length) { adv = a; pre = edges[0].id; break; }
  }
  ok(!!adv && !!pre, `found advanced atom (${adv && adv.id}) encompassing prereq (${pre})`);

  const t0 = Date.now();
  // Introduce + lightly stabilize the prereq so it's "started" and retained.
  E.grade(pre, 3, "recall", t0);
  E.grade(pre, 3, "recall", t0 + 2 * DAY);
  // Introduce the advanced atom.
  E.grade(adv.id, 3, "recall", t0 + 3 * DAY);

  const preCardBefore = Object.assign({}, E.cardFor(pre));
  const tFire = t0 + 4 * DAY;
  // Review ONLY the advanced atom with Good -> should FIRe-credit the prereq.
  const patches = E._applyFire(adv.id, 3, tFire);
  const credited = patches.find((p) => p.id === pre);
  ok(!!credited, "FIRe produced a credit patch for the encompassed prereq");
  // Apply (grade does this; here we test _applyFire's patches were applied by re-running through grade)
  E.reset();
  E.grade(pre, 3, "recall", t0);
  E.grade(pre, 3, "recall", t0 + 2 * DAY);
  E.grade(adv.id, 3, "recall", t0 + 3 * DAY);
  const beforeS = E.cardFor(pre).stability;
  const beforeDue = E.cardFor(pre).due;
  E.grade(adv.id, 4, "apply", tFire); // a strong success on the advanced atom
  const afterS = E.cardFor(pre).stability;
  const afterDue = E.cardFor(pre).due;
  ok(afterS >= beforeS, "prereq stability did not DECREASE from FIRe");
  ok(afterS > beforeS, "prereq stability INCREASED (implicit credit landed)");
  ok(afterDue >= beforeDue, "prereq due date pushed OUT, never pulled in");
  // Boundedness: a single FIRe event can't exceed the +15% cap.
  ok(afterS <= beforeS * (1 + Adaptive.ADAPTIVE.FIRE_MAX_STABILITY_GAIN) + 1e-6,
    "FIRe stability gain is bounded by FIRE_MAX_STABILITY_GAIN (+15%)");
  // Honesty: FIRe must NOT touch proficiency (it's implicit, so nothing is graded).
  const profBefore = E.state.prof[pre] ? E.state.prof[pre].n : 0;
  E.grade(adv.id, 3, "apply", tFire + DAY);
  const profAfter = E.state.prof[pre] ? E.state.prof[pre].n : 0;
  ok(profBefore === profAfter, "FIRe does NOT increment prereq proficiency attempts (honest)");

  // FIRe never resurrects a forgotten card: push prereq far past its interval.
  const farFuture = tFire + 5000 * DAY;
  const p2 = E._applyFire(adv.id, 3, farFuture);
  ok(!p2.find((p) => p.id === pre), "FIRe skips a near-forgotten prereq (retrievability gate)");

  /* ---------------- (3) Mastery model (bkt-uzx) ---------------- */
  console.log("\n[3] Mastery model — proficiency x retention");
  E.reset();
  const target = adv.id;
  // Back-compat: masteryFor always returns a number in [0,1].
  const m0 = E.masteryFor(target);
  ok(typeof m0 === "number" && m0 >= 0 && m0 <= 1, "masteryFor returns a 0..1 number (back-compat)");
  ok(E.masteryDetail("does-not-exist") === null, "masteryDetail(unstarted) === null");

  // Drive the concept up with repeated strong successes at increasing depth.
  let t = Date.now();
  const depths = ["recall", "recall", "apply", "apply", "derive", "derive", "teach"];
  depths.forEach((lvl, i) => { E.grade(target, 4, lvl, t + i * 3 * DAY); });
  const det = E.masteryDetail(target);
  ok(det && typeof det.mastery === "number", "masteryDetail returns a rich object");
  ok(det.proficiency >= 0 && det.proficiency <= 1, "proficiency in [0,1]");
  ok(det.retention >= 0 && det.retention <= 1, "retention(@horizon) in [0,1]");
  approx(det.mastery,
    Math.pow(det.proficiency, Adaptive.ADAPTIVE.MASTERY_ALPHA) * Math.pow(det.retention, Adaptive.ADAPTIVE.MASTERY_BETA),
    2e-3, "mastery == proficiency^alpha * retention^beta");
  ok(["emerging", "developing", "established"].includes(det.confidence),
    "confidence band is one of emerging/developing/established");
  ok(det.attempts === depths.length, `proficiency counted ${depths.length} graded attempts`);
  console.log("      mastered concept detail:", JSON.stringify(det));

  // Multiplicative collapse: a high-proficiency card that's been left to decay
  // (low retention at horizon) must NOT read as mastered, the whole point.
  // Simulate by checking masteryDetail at a far-future `now` (retention readout)
  // and that fuseMastery collapses when one factor -> 0.
  ok(Adaptive.fuseMastery(0.95, 0.0) === 0, "fuseMastery collapses to 0 when retention is 0 (no cramming-certifies)");
  ok(Adaptive.fuseMastery(0.0, 0.95) === 0, "fuseMastery collapses to 0 when proficiency is 0");
  const partial = Adaptive.fuseMastery(0.81, 0.64);
  approx(partial, 0.81 * 0.64, 1e-9, "fuseMastery is the product at alpha=beta=1");

  // cold-start: a concept introduced but never quizzed falls back to the
  // stability proxy, never a fake 0.
  E.reset();
  E.grade("boltzmann", 3, "recall", Date.now()); // one rep -> has proficiency now
  ok(E.masteryFor("boltzmann") > 0, "a started concept reports > 0 mastery");

  /* ---------------- back-compat: full curriculum still completes ---------------- */
  console.log("\n[4] Back-compat — full 60-day simulation still drains the frontier");
  E.reset();
  let now = Date.now();
  for (let d = 0; d < 60; d++) {
    const day = now + d * DAY;
    for (const it of E.route(day)) E.grade(it.id, 3, "recall", day);
  }
  const s = E.summary(now + 60 * DAY);
  ok(s.introduced === E.atoms.length, `all ${E.atoms.length} atoms introduced`);
  ok(s.mastered >= 0 && s.mastered <= s.introduced, "mastered count is sane");
  console.log(`      introduced=${s.introduced} mastered=${s.mastered} xp=${s.xp} streak=${s.streak}`);

  console.log("\n" + (failures ? `FAILED: ${failures} assertion(s)` : "ALL ADAPTIVE TESTS PASSED"));
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
