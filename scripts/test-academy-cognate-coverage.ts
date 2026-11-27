import test from "node:test";
import assert from "node:assert/strict";
import { UNSTUDIED_COGNATE_WEIGHT, cognateAdjusted, cognateKnownCount, heldCognates, heldFromCards, cognateFileUrl, loadCognates, parseCognates, withCognates, type CognateIndex } from "../src/lib/academy/cognate-coverage";
import { planUnit, rawCoverage, UNKNOWN_BELOW, type Learner } from "../src/lib/academy/input-selector";

const DAY = 86_400_000;
const NOW = 100 * DAY;
const INDEX: CognateIndex = { nación: { en: ["nation"], fr: ["nation"] }, agua: { pt: ["água"] }, casa: { it: ["casa"] } };
const fresh = { stability: 30, lastReview: NOW - DAY };
const stale = { stability: 1, lastReview: NOW - 60 * DAY };
const HELD = heldFromCards({ "fr:nation": fresh, "pt:água": stale, "es:nación": fresh }, NOW);

function learner(p: Record<string, number>): Learner {
  return { p: (l) => p[l] ?? 0, due: new Set(), rank: () => null, recent: {}, lastVideo: null };
}

test("a cognate is shown only in a held language known at R >= 0.9", () => {
  assert.deepEqual(heldCognates(INDEX, "es", "nación", HELD).map((c) => [c.lang, c.lemma]), [["fr", "nation"]]);
  assert.deepEqual(heldCognates(INDEX, "es", "agua", HELD), []);
  assert.deepEqual(heldCognates(INDEX, "es", "perro", HELD), []);
  assert.deepEqual(heldCognates(null, "es", "nación", HELD), []);
});

test("a recognised unknown word counts 0.5 and a known word keeps its probability", () => {
  assert.equal(cognateAdjusted(0, true), UNSTUDIED_COGNATE_WEIGHT);
  assert.equal(cognateAdjusted(0.2, false), 0.2);
  assert.equal(cognateAdjusted(0.95, true), 0.95);
  assert.equal(cognateAdjusted(Number.NaN, false), 0);
});

test("coverage stays in [0,1] and never drops when a held language is added", () => {
  const lemmas = Array.from({ length: 40 }, (_, i) => (i % 4 === 0 ? "nación" : i % 4 === 1 ? "agua" : "el"));
  const base = learner({ el: 1 });
  const none = withCognates(base, "es", INDEX, () => 0);
  const some = withCognates(base, "es", INDEX, HELD);
  const all = withCognates(base, "es", INDEX, () => 1);
  const c = [rawCoverage(lemmas, none), rawCoverage(lemmas, some), rawCoverage(lemmas, all)];
  for (const x of c) assert.ok(x >= 0 && x <= 1);
  assert.ok(c[0] <= c[1] && c[1] <= c[2], c.join(" "));
  assert.equal(c[1], (20 + 10 * UNSTUDIED_COGNATE_WEIGHT) / 40);
});

test("the selector sees cognate-adjusted coverage", () => {
  const lemmas = Array.from({ length: 40 }, (_, i) => (i === 0 ? "nación" : "el"));
  const plain = planUnit("u", lemmas, [], false, null, learner({ el: 1 }));
  const adjusted = planUnit("u", lemmas, [], false, null, withCognates(learner({ el: 1 }), "es", INDEX, HELD));
  assert.ok(adjusted.coverage >= plain.coverage);
  assert.equal(adjusted.coverage, (39 + UNSTUDIED_COGNATE_WEIGHT) / 40);
});

test("the known-word estimate adds recognised cognates at weight 0.5", () => {
  const evidence = { el: { stability: 30, lastReview: NOW - DAY } };
  const without = cognateKnownCount("es", evidence, null, HELD, NOW, 0);
  const withIdx = cognateKnownCount("es", evidence, INDEX, HELD, NOW, 0);
  assert.ok(Math.abs(withIdx - without - UNSTUDIED_COGNATE_WEIGHT) < 1e-9, `${without} ${withIdx}`);
  assert.ok(cognateKnownCount("es", evidence, INDEX, () => 1, NOW, 0) >= withIdx);
});

test("parse and load reject files for another language or format", async () => {
  assert.equal(parseCognates({ format: "polingual-cognates", lang: "fr", cognates: {} }, "es"), null);
  assert.equal(parseCognates({ format: "other", lang: "es", cognates: {} }, "es"), null);
  assert.deepEqual(parseCognates({ format: "polingual-cognates", lang: "es", cognates: INDEX }, "es"), INDEX);
  const FILE = "cognates.es.0123456789ab.json";
  const manifest = { bandBase: "https://store.example/polingual-input", cognates: { es: { file: FILE }, fr: { file: "../evil.json" } } };
  const seen: string[] = [];
  const fetcher = (async (u: string) => {
    seen.push(u);
    if (u === "/x/manifest.json") return new Response(JSON.stringify(manifest));
    if (u === `https://store.example/polingual-input/${FILE}`) return new Response(JSON.stringify({ format: "polingual-cognates", lang: "es", cognates: INDEX }));
    return new Response("", { status: 404 });
  }) as typeof fetch;
  assert.deepEqual(await loadCognates("es", "/x", fetcher, undefined, true), INDEX);
  assert.equal(await loadCognates("fr", "/x", fetcher, undefined, true), null);
  assert.equal(await loadCognates("it", "/x", fetcher, undefined, true), null);
  assert.equal(await loadCognates("es", "/x", fetcher, "http://127.0.0.1:54321/storage", true), null);
  assert.ok(!seen.some((u) => u.includes("evil")));
  assert.equal(cognateFileUrl(manifest, "es", "https://store.example/polingual-input/", false), `https://store.example/polingual-input/${FILE}`);
});

test("a unit made only of recognised cognates counts 0.5 per token, glosses none up front and is not selected", () => {
  assert.equal(UNSTUDIED_COGNATE_WEIGHT, UNKNOWN_BELOW);
  const lemmas = Array.from({ length: 40 }, () => "nación");
  const plan = planUnit("u", lemmas, [], false, null, withCognates(learner({}), "es", INDEX, HELD));
  assert.equal(plan.coverage, UNSTUDIED_COGNATE_WEIGHT);
  assert.deepEqual(plan.glossed, []);
  assert.deepEqual(plan.newWords, []);
  assert.equal(plan.eligible, false);
  assert.deepEqual(heldCognates(INDEX, "es", "nación", HELD).map((c) => c.lemma), ["nation"]);
});
