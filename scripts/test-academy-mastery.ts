/* Parity test (bkt-uzx): the server-side mastery port (src/lib/academy/mastery.ts)
 * MUST produce the same fused mastery the in-app engine (learning/app/js) does for
 * the SAME persisted state. We drive the real biophysics corpus through the engine,
 * capture its persisted {cards, prof} blob, then roll it up with the TS port and
 * assert per-concept mastery matches within rounding.
 *
 * Run:  npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-academy-mastery.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { rollupBranch, type Corpus, type StoredEngineState } from "../src/lib/academy/mastery";

const require2 = createRequire(__filename);
const appDir = join(__dirname, "..", "learning", "app");

// localStorage shim + fetch shim so the vanilla-JS engine runs under node.
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
};
const corpusJson = readFileSync(join(appDir, "corpus", "biophysics.json"), "utf8");
const corpus: Corpus = JSON.parse(corpusJson);
(globalThis as any).fetch = async () => ({ json: async () => JSON.parse(corpusJson) });

const Adaptive = require2(join(appDir, "js", "adaptive.js"));
(globalThis as any).Adaptive = Adaptive;
require2(join(appDir, "js", "fsrs.js"));
require2(join(appDir, "js", "engine.js"));
const Engine = (globalThis as any).Engine;

let failures = 0;
function ok(c: boolean, m: string) { if (c) console.log("  ok  " + m); else { console.error("  FAIL " + m); failures++; } }

(async () => {
  const E = new Engine();
  await E.load("x");
  const DAY = 86400000;
  const t0 = Date.now();

  // Build a realistic, varied history so concepts land at different depths/retention.
  let now = t0;
  for (let d = 0; d < 75; d++) {
    const day = now + d * DAY;
    for (const it of E.route(day)) {
      const m = E.masteryFor(it.id, day);
      const lvl = m < 0.25 ? "recall" : m < 0.5 ? "apply" : m < 0.75 ? "derive" : "teach";
      const r = it.kind === "review" ? (d % 7 === 0 ? 2 : d % 3 === 0 ? 4 : 3) : 3;
      E.grade(it.id, r, lvl, day);
    }
  }

  // The engine's persisted state blob = exactly what the server reads from Supabase.
  const persisted: StoredEngineState = JSON.parse(store[E.lsKey]);
  ok(!!persisted.cards && Object.keys(persisted.cards).length > 0, "engine persisted cards");
  ok(!!persisted.prof && Object.keys(persisted.prof).length > 0, "engine persisted proficiency (prof)");

  const evalNow = now + 75 * DAY;
  const summary = rollupBranch("biophysics", corpus, persisted, evalNow);

  // Per-concept parity: server rollup mastery == engine.masteryFor for every atom.
  let maxDiff = 0;
  let compared = 0;
  for (const c of summary.concepts) {
    const engineM = E.masteryFor(c.id, evalNow);
    const diff = Math.abs(engineM - c.mastery);
    if (diff > maxDiff) maxDiff = diff;
    compared++;
  }
  ok(compared === E.atoms.length, `compared all ${E.atoms.length} concepts`);
  ok(maxDiff <= 1.5e-3, `server mastery matches engine within rounding (max diff ${maxDiff.toFixed(5)})`);

  // The fused-mastery components are present + multiplicative on graded concepts.
  const graded = summary.concepts.filter((c) => c.attempts > 0 && c.proficiency != null && c.retention != null);
  ok(graded.length > 0, `${graded.length} concepts carry proficiency+retention components`);
  let fusionOk = true;
  for (const c of graded) {
    const expect = (c.proficiency as number) * (c.retention as number); // alpha=beta=1
    if (Math.abs(expect - c.mastery) > 2e-3) fusionOk = false;
  }
  ok(fusionOk, "server mastery == proficiency * retention on graded concepts");

  // Honesty: branch confidence band is one of the three qualitative bands.
  ok(["emerging", "developing", "established"].includes(summary.confidence),
    `branch confidence band = ${summary.confidence}`);
  console.log(`      branch: started=${summary.started} mastered=${summary.mastered} ` +
    `meanMastery=${summary.meanMastery} confidence=${summary.confidence}`);

  // Pre-P1 migration: a state with NO `prof` map must still roll up (legacy proxy).
  const legacyState: StoredEngineState = { cards: persisted.cards }; // drop prof
  const legacy = rollupBranch("biophysics", corpus, legacyState, evalNow);
  ok(legacy.started === summary.started, "legacy (no-prof) state still rolls up (graceful migration)");
  ok(legacy.concepts.every((c) => c.proficiency === null),
    "legacy state reports null proficiency (falls back to stability proxy, no fake numbers)");

  console.log("\n" + (failures ? `FAILED: ${failures} assertion(s)` : "MASTERY PARITY TESTS PASSED"));
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
