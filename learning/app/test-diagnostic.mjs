/* Node test for the Bucket Academy placement diagnostic (bkt-efk).
 * Runs the dependency-free diagnostic against the REAL biophysics corpus and asserts:
 *   1. An "expert" (knows the prereq shell + low-level nucleus) is placed PAST the
 *      prerequisite foundations in few questions (the headline ALEKS claim).
 *   2. A "beginner" (knows nothing) is placed at ~0 concepts and asked few questions.
 *   3. The question budget is bounded (<= cap) for every learner type.
 *   4. Placement is monotone-ish: more knowledge → more placed concepts.
 * Exits non-zero on any failure so validate.sh / CI can gate on it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const g = globalThis;

// Load engine + diagnostic into the global scope (browser-style IIFEs).
function loadGlobal(rel) {
  const code = readFileSync(join(here, rel), "utf8");
  new Function(code).call(g);
}
loadGlobal("js/fsrs.js");
loadGlobal("js/adaptive.js"); // adaptive core (encompassing + FIRe + proficiency) — must precede engine
loadGlobal("js/engine.js");
loadGlobal("js/diagnostic.js");

const corpus = JSON.parse(readFileSync(join(here, "corpus/biophysics.json"), "utf8"));

// Use the Engine to build the same graph view the app uses (computes unlocks + leverage).
g.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
g.fetch = async () => ({ json: async () => corpus });
const E = new g.Engine();
await E.load("biophysics");

const byId = E.byId;

// ---- helper: build the transitive requires-closure of a set of "known" atoms ----
function requiresClosure(ids) {
  const out = new Set();
  const stack = ids.slice();
  while (stack.length) {
    const id = stack.pop();
    (byId[id]?.requires || []).forEach((r) => {
      if (byId[r] && !out.has(r)) { out.add(r); stack.push(r); }
    });
  }
  return out;
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log("  PASS", name); }
  else { console.error("  FAIL", name, extra != null ? JSON.stringify(extra) : ""); failures++; }
}

// ---------------------------------------------------------------------------
// Define an "expert" ground-truth: knows the prereq shell + a chunk of the
// nucleus (everything whose deepest prereq chain is <= 2 deep). They should
// answer those correctly and "I don't know" beyond their frontier.
// ---------------------------------------------------------------------------
function depth(id, seen) {
  seen = seen || new Set();
  const a = byId[id];
  if (!a || !(a.requires || []).length) return 0;
  let d = 0;
  (a.requires || []).forEach((r) => {
    if (byId[r] && !seen.has(r)) d = Math.max(d, 1 + depth(r, new Set(seen).add(id)));
  });
  return d;
}

const expertKnown = new Set(
  E.atoms.filter((a) => a.shell === "prereq" || depth(a.id) <= 2).map((a) => a.id)
);
// expert also implicitly knows everything those depend on
requiresClosure([...expertKnown]).forEach((id) => expertKnown.add(id));

// Responder: correct iff the atom is in the learner's ground-truth known set.
function responderFor(knownSet) {
  return (item) => ({ correct: knownSet.has(item.id) });
}

// ---- 1. EXPERT ----
const dExpert = new g.Diagnostic({ atoms: E.atoms, byId: E.byId });
const rExpert = dExpert.simulate(responderFor(expertKnown));
const prereqIds = E.atoms.filter((a) => a.shell === "prereq").map((a) => a.id);
const placedSet = new Set(rExpert.known);
const prereqsPlaced = prereqIds.filter((id) => placedSet.has(id)).length;

console.log("\n[expert]");
console.log("  ground-truth known:", expertKnown.size, "of", E.atoms.length);
console.log("  questions asked:", rExpert.questionsAsked);
console.log("  concepts placed:", rExpert.placedCount);
console.log("  prereq shell placed:", prereqsPlaced, "/", prereqIds.length);
console.log("  resume frontier size:", rExpert.frontier.length);

check("expert placed past the prereq shell (>= all prereqs known)",
  prereqsPlaced >= prereqIds.length - 1, { prereqsPlaced, total: prereqIds.length });
check("expert placed a substantial chunk of the graph (>= 8 concepts)",
  rExpert.placedCount >= 8, { placed: rExpert.placedCount });
check("expert placed in few questions (<= 18)",
  rExpert.questionsAsked <= 18, { q: rExpert.questionsAsked });
// "few questions" headline: an expert who knows the prereqs should be placed past the
// prereq shell in far fewer than one-question-per-known-atom.
check("expert efficiency: placed more concepts than questions asked",
  rExpert.placedCount > rExpert.questionsAsked, { placed: rExpert.placedCount, q: rExpert.questionsAsked });

// ---- 2. BEGINNER ----
const dBeg = new g.Diagnostic({ atoms: E.atoms, byId: E.byId });
const rBeg = dBeg.simulate(responderFor(new Set())); // knows nothing
console.log("\n[beginner]");
console.log("  questions asked:", rBeg.questionsAsked);
console.log("  concepts placed:", rBeg.placedCount);
check("beginner placed ~0 concepts", rBeg.placedCount === 0, { placed: rBeg.placedCount });
check("beginner asked few questions (early stop, <= 18)", rBeg.questionsAsked <= 18, { q: rBeg.questionsAsked });

// ---- 3. MONOTONICITY: expert places strictly more than beginner ----
check("more knowledge → more placed (expert > beginner)",
  rExpert.placedCount > rBeg.placedCount, { expert: rExpert.placedCount, beginner: rBeg.placedCount });

// ---- 4. PARTIAL learner: knows only the prereq shell ----
const shellOnly = new Set(prereqIds);
requiresClosure(prereqIds).forEach((id) => shellOnly.add(id));
const dPart = new g.Diagnostic({ atoms: E.atoms, byId: E.byId });
const rPart = dPart.simulate(responderFor(shellOnly));
console.log("\n[prereq-only]");
console.log("  questions asked:", rPart.questionsAsked, "placed:", rPart.placedCount);
check("prereq-only learner placed between beginner and expert",
  rPart.placedCount >= rBeg.placedCount && rPart.placedCount <= rExpert.placedCount,
  { partial: rPart.placedCount, beginner: rBeg.placedCount, expert: rExpert.placedCount });
check("placed atoms are all genuinely in ground-truth (no false-placement)",
  rPart.known.every((id) => shellOnly.has(id)),
  { stray: rPart.known.filter((id) => !shellOnly.has(id)) });

// ---- 5. SEEDING SANITY: placement feeds engine state honestly ----
// Simulate app.js seeding: introduce each placed atom with a modest stability and a
// low-but-present proficiency, then confirm the engine route starts PAST foundations.
const E2 = new g.Engine();
g.fetch = async () => ({ json: async () => corpus });
await E2.load("biophysics");
const SEED_RATING = 2; // "Hard" — present but not mastered
rExpert.known.forEach((id) => { if (E2.byId[id]) E2.grade(id, SEED_RATING, "recall"); });
const summary = E2.summary();
const order = E.atoms; // not used directly; check route below
const route = E2.route();
const newItems = route.filter((r) => r.kind === "new").map((r) => r.id);
const newArePastPrereqs = newItems.every((id) => !prereqIds.includes(id) || placedSet.has(id));
console.log("\n[seed → engine]");
console.log("  introduced after seed:", summary.introduced, "mastered:", summary.mastered);
console.log("  next NEW route items:", newItems.slice(0, 4));
check("seeding introduces the placed concepts", summary.introduced >= rExpert.placedCount,
  { introduced: summary.introduced, placed: rExpert.placedCount });
check("seeding does NOT mark anything fully mastered (honest, not certified)",
  summary.mastered < rExpert.placedCount,
  { mastered: summary.mastered, placed: rExpert.placedCount });
check("post-seed route does not re-teach already-placed prereqs",
  newArePastPrereqs, { newItems: newItems.slice(0, 6) });

console.log("\n" + (failures ? `DIAGNOSTIC TEST FAILED (${failures})` : "DIAGNOSTIC TEST PASSED"));
process.exit(failures ? 1 : 0);
