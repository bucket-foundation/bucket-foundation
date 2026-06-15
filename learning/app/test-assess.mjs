/* Node test for the Bucket Academy "Test yourself" assessment engine (bkt-v7y;
 * deterministic grading = bkt-3so). Runs the dependency-free grader + run builder
 * against synthetic normalization cases AND real corpus answers, asserting:
 *   1. Numeric equivalence with unit/sign/whitespace/scientific-notation normalization.
 *   2. Known PASS and FAIL cases (right value passes; wrong value fails).
 *   3. Prose answers are correctly declared NOT auto-gradable (→ honest self-check).
 *   4. buildRun produces a sealed spread across concepts + Bloom levels.
 *   5. summarize() splits trust (auto vs self) and surfaces weak concepts.
 * Exits non-zero on any failure so validate.sh / CI can gate on it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const g = globalThis;
function loadGlobal(rel) { new Function(readFileSync(join(here, rel), "utf8")).call(g); }
loadGlobal("js/fsrs.js");
loadGlobal("js/adaptive.js");
loadGlobal("js/engine.js");
loadGlobal("js/assess.js");
const A = g.Assess;

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log("  PASS", name);
  else { console.error("  FAIL", name, extra != null ? JSON.stringify(extra) : ""); failures++; }
}

console.log("[grader — normalization + numeric tolerance]");

// --- whitespace / case ---
let r = A.gradeAnswer("  16  states ", "16 states");
check("whitespace-insensitive numeric match", r.gradable && r.correct, r);

// --- sign ---
check("sign mismatch fails (−5 vs 5)", (() => { const x = A.gradeAnswer("5", "-5"); return x.gradable && !x.correct; })());
check("unicode minus normalizes (−5 == -5)", (() => { const x = A.gradeAnswer("-5", "−5"); return x.gradable && x.correct; })());

// --- units ---
check("unit-agnostic when learner omits obvious unit (0.10 vs 0.10 mol)",
  (() => { const x = A.gradeAnswer("0.10", "= 0.10 mol."); return x.gradable && x.correct; })());
check("explicit matching unit passes (4.7 vs pH = 4.7)",
  (() => { const x = A.gradeAnswer("4.7", "pH = 4.7"); return x.gradable && x.correct; })());

// --- scientific notation (the headline 6.022×10²³ case) ---
check("scientific notation: 6.022e23 == 6.022×10²³",
  (() => { const x = A.gradeAnswer("6.022e23", "6.022×10²³ molecules."); return x.gradable && x.correct; })(),
  A.gradeAnswer("6.022e23", "6.022×10²³ molecules."));
check("scientific notation written long form: 6.022 x 10^23 == 6.022×10²³",
  (() => { const x = A.gradeAnswer("6.022 x 10^23", "6.022×10²³ molecules."); return x.gradable && x.correct; })());
check("ph product 1.0×10⁻¹⁴ matches 1e-14",
  (() => { const x = A.gradeAnswer("1e-14", "1.0×10⁻¹⁴, the product [H⁺][OH⁻]."); return x.gradable && x.correct; })(),
  A.gradeAnswer("1e-14", "1.0×10⁻¹⁴, the product [H⁺][OH⁻]."));

// --- tolerance (within 1% passes, off-by-a-lot fails) ---
check("within tolerance passes (6.02e23 ~ 6.022e23)",
  (() => { const x = A.gradeAnswer("6.02e23", "6.022×10²³ molecules."); return x.gradable && x.correct; })());
check("out of tolerance fails (5e23 vs 6.022e23)",
  (() => { const x = A.gradeAnswer("5e23", "6.022×10²³ molecules."); return x.gradable && !x.correct; })());

// --- "= 16" extracted from prose "2^4 = 16 states." ---
check("salient value after '=' extracted from prose (16 from '2^4 = 16 states.')",
  (() => { const x = A.gradeAnswer("16", "2^4 = 16 states."); return x.gradable && x.correct; })(),
  A.gradeAnswer("16", "2^4 = 16 states."));
check("wrong salient value fails (8 vs 16)",
  (() => { const x = A.gradeAnswer("8", "2^4 = 16 states."); return x.gradable && !x.correct; })());

// --- fractions / 0.10 mol worked answer ---
check("worked answer salient 0.10 (from '0.40 mol/L × 0.250 L = 0.10 mol.')",
  (() => { const x = A.gradeAnswer("0.10 mol", "0.40 mol/L × 0.250 L = 0.10 mol."); return x.gradable && x.correct; })(),
  A.gradeAnswer("0.10 mol", "0.40 mol/L × 0.250 L = 0.10 mol."));

// --- blank is gradable-but-wrong ---
check("blank input is gradable and incorrect", (() => { const x = A.gradeAnswer("", "16 states"); return x.gradable && !x.correct; })());

// --- short symbolic equality ---
check("short symbolic equality passes (η = 1 − T_c/T_h)",
  (() => { const x = A.gradeAnswer("1 - T_c/T_h", "1 − T_c/T_h"); return x.gradable && r.correct !== undefined && x.correct; })(),
  A.gradeAnswer("1 - T_c/T_h", "1 − T_c/T_h"));

console.log("\n[grader — prose answers fall back to self-check, never guess]");
const prose = "By preferentially stabilizing (binding) the transition state, lowering ΔG‡.";
check("long prose answer is NOT auto-gradable", (() => { const x = A.gradeAnswer("it lowers the barrier", prose); return x.gradable === false; })(),
  A.gradeAnswer("it lowers the barrier", prose));
const prose2 = "(1) The laws of physics are identical in all inertial frames. (2) The speed of light in vacuum is the same for all inertial observers.";
check("two-postulate prose answer is NOT auto-gradable", A.gradeAnswer("relativity postulates", prose2).gradable === false);

console.log("\n[grader — sweep the REAL corpus: numeric answers grade, prose defers]");
import("node:fs").then(() => {});
let glob = [];
for (const f of ["01-mathematics", "02-physics", "03-chemistry", "04-information", "biophysics", "06-cosmology", "07-mind"]) {
  try { glob.push(JSON.parse(readFileSync(join(here, "corpus", f + ".json"), "utf8"))); } catch (e) {}
}
let autoGradable = 0, proseDeferred = 0, selfMatchPass = 0, totalQuiz = 0;
glob.forEach((d) => (d.atoms || []).forEach((a) => (a.quiz || []).forEach((q) => {
  totalQuiz++;
  // grade the CANONICAL answer against itself: a correct learner who typed the exact
  // answer must always be graded correct (or deferred to self-check, never marked wrong).
  const v = A.gradeAnswer(q.answer, q.answer);
  if (v.gradable) {
    autoGradable++;
    if (v.correct) selfMatchPass++;
  } else {
    proseDeferred++;
  }
})));
console.log("  corpus quiz items:", totalQuiz, "| auto-gradable:", autoGradable, "| prose→self-check:", proseDeferred);
check("some corpus items are deterministically auto-gradable (>= 30)", autoGradable >= 30, { autoGradable });
check("most corpus items (prose) correctly defer to self-check (>= 60%)",
  proseDeferred / totalQuiz >= 0.6, { proseDeferred, totalQuiz, frac: +(proseDeferred / totalQuiz).toFixed(2) });
check("NO auto-gradable item marks the exact canonical answer WRONG (grader never punishes a correct answer)",
  selfMatchPass === autoGradable, { autoGradable, selfMatchPass });

console.log("\n[buildRun — sealed spread across concepts + Bloom levels]");
const corpus = JSON.parse(readFileSync(join(here, "corpus/biophysics.json"), "utf8"));
g.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
g.fetch = async () => ({ json: async () => corpus });
const E = new g.Engine();
await E.load("biophysics");
// introduce a handful so the "started" universe is non-empty
const order = E.atoms.slice(0, 12);
order.forEach((a) => E.grade(a.id, 3, "recall"));
const graph = { atoms: E.atoms, byId: E.byId, branch: (E.meta && E.meta.branch) || "biophysics" };
const state = { cardForId: (id) => E.cardFor(id) };
const run = A.buildRun(graph, state, { size: 8, rng: () => 0.5 });
console.log("  run items:", run.items.length, "concepts:", run.conceptCount,
  "levels:", Array.from(new Set(run.items.map((i) => i.level))).join(","));
check("buildRun returns a sealed run of the requested size (or pool max)", run.items.length >= 3 && run.items.length <= 8, { n: run.items.length });
check("every run item carries prompt + answer + level (sealed-renderable)",
  run.items.every((i) => i.prompt && i.answer && i.level && i.atomId), run.items[0]);
check("run spreads >= 2 Bloom levels", new Set(run.items.map((i) => i.level)).size >= 2,
  Array.from(new Set(run.items.map((i) => i.level))));
check("run does not over-repeat one concept (breadth-first)",
  Math.max(...Object.values(run.items.reduce((m, i) => ((m[i.atomId] = (m[i.atomId] || 0) + 1), m), {}))) <= 2);

console.log("\n[summarize — trust split + weak concepts]");
const sample = [
  { atomId: "a1", level: "recall", correct: true, autoGraded: true, latencyMs: 1200 },
  { atomId: "a2", level: "apply", correct: false, autoGraded: true, latencyMs: 3400 },
  { atomId: "a3", level: "derive", correct: true, autoGraded: false, latencyMs: 8000 },
  { atomId: "a4", level: "recall", correct: false, autoGraded: false, latencyMs: 2200 },
];
const sm = A.summarize(sample);
check("summary overall score correct (2/4)", Math.abs(sm.score - 0.5) < 1e-9, sm.score);
check("summary splits auto (1/2) vs self (1/2)", sm.auto.total === 2 && sm.auto.correct === 1 && sm.self.total === 2 && sm.self.correct === 1, sm);
check("summary trust = mixed (some auto, some self)", sm.trust === "mixed", sm.trust);
check("summary weak concepts = the missed ones [a2,a4]", sm.weakConcepts.join(",") === "a2,a4", sm.weakConcepts);
check("summary byLevel tracks recall t/c", sm.byLevel.recall.total === 2 && sm.byLevel.recall.correct === 1, sm.byLevel);

console.log("\n[firewall — assessment verdict feeds the engine proficiency path]");
// Simulate: an auto-graded CORRECT on a tested atom should raise its proficiency through
// the existing engine.grade() path (so masteryDetail reflects tested proficiency).
const tested = E.atoms.find((a) => a.quiz && a.quiz.length && E.cardFor(a.id));
const before = E.masteryDetail(tested.id);
E.grade(tested.id, A.ratingFor(true), "apply"); // assessment-correct → Good at apply depth
const after = E.masteryDetail(tested.id);
check("assessment-correct raises tested proficiency (attempts++ via grade path)",
  after.attempts > (before.attempts || 0), { before: before.attempts, after: after.attempts });

console.log("\n" + (failures ? `ASSESS TEST FAILED (${failures})` : "ASSESS TEST PASSED"));
process.exit(failures ? 1 : 0);
