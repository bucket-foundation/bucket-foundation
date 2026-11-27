import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildLangCorpus } from "../src/lib/academy/lang-systems";
import { bandFileUrls, bandsFor, expandBandItem, glossBudget, mergeBands, type BandItem, type InputBundle, lemmaCardMap, UNFITTED_SELECTOR_WEIGHTS, loadBundle, MAX_NEW, MEDIA_FLOOR, MIN_UNIT_TOKENS, NEW_SHARE, parseBundle, planBundle, planUnit, resolverFrom, select, TEXT_BAND, type Learner } from "../src/lib/academy/input-selector";

const ROOT = path.join(__dirname, "..");
const V = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/academy/selector-vectors.json"), "utf8"));
const close = (a: number, b: number, m: string) => assert.ok(Math.abs(a - b) < 1e-8, `${m}: ${a} vs ${b}`);

type L = { p: Record<string, number>; due: string[]; rank: Record<string, number>; recent: Record<string, number>; lastVideo: string | null };
const learner = (x: L): Learner => ({ p: (k) => x.p[k] ?? 0, due: new Set(x.due), rank: (k) => x.rank[k] ?? null, recent: x.recent, lastVideo: x.lastVideo });

for (const c of V.cases) {
  test(`golden selector: ${c.name}`, () => {
    const l = learner(c.learner);
    const units = V.units.filter((u: { id: string }) => c.units.includes(u.id));
    const plans = units.map((u: { id: string; lemmas: string[]; targets: string[]; media: boolean; video: string | null }) => planUnit(u.id, u.lemmas, u.targets, u.media, u.video, l));
    plans.forEach((p: ReturnType<typeof planUnit>, i: number) => {
      const e = c.plans[i];
      assert.deepEqual({ ...p, coverage: 0, score: 0 }, { ...e, coverage: 0, score: 0 });
      close(p.coverage, e.coverage, `${p.unit} coverage`);
      close(p.score, e.score, `${p.unit} score`);
    });
    const pick = select(plans, l, (id) => V.units.find((u: { id: string }) => u.id === id).lemmas);
    assert.deepEqual(pick ? { unit: pick.plan.unit, fallback: pick.fallback, glossed: pick.plan.glossed, newWords: pick.plan.newWords } : null, c.selected);
  });
}

test("C2: every eligible plan meets size, band and new-word bounds", () => {
  let seed = 3;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let t = 0; t < 400; t++) {
    const n = 20 + Math.floor(rand() * 60);
    const lemmas = Array.from({ length: n }, () => `w${Math.floor(rand() * 30)}`);
    const p: Record<string, number> = {};
    for (let i = 0; i < 30; i++) p[`w${i}`] = rand() < 0.85 ? 1 : rand();
    const media = rand() < 0.3;
    const plan = planUnit(`u${t}`, lemmas, rand() < 0.5 ? [] : lemmas.slice(0, 5), media, null, learner({ p, due: [], rank: {}, recent: {}, lastVideo: null }));
    if (!plan.eligible) continue;
    assert.ok(plan.tokens >= MIN_UNIT_TOKENS);
    assert.ok(plan.coverage >= 0 && plan.coverage <= 1);
    assert.ok(media ? plan.coverage >= MEDIA_FLOOR : plan.coverage >= TEXT_BAND[0] && plan.coverage <= TEXT_BAND[1]);
    const k = plan.newWords.length;
    assert.ok(k >= 1 && k <= MAX_NEW && k <= NEW_SHARE * plan.tokens);
    assert.ok(plan.glossed.length <= glossBudget(plan.tokens));
  }
});

test("the lemma map points bundle lemmas at corpus word cards", () => {
  const CORPUS = path.join(ROOT, "learning", "app", "corpus");
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8"));
  const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
  const map = lemmaCardMap(corpus, "es");
  assert.ok(map.size > 100);
  const [lemma, card] = Array.from(map.entries())[0];
  assert.ok(card.startsWith("es:") && corpus.byId.has(card.slice(3)));
  assert.equal(resolverFrom({ es: map })("es", lemma.toUpperCase()), card);
});

function realBundle(): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/fixtures/polingual-input/es.json"), "utf8"));
}

const bundle = realBundle();

test("the CI 2 Spanish fixture plans and selects within the rules", () => {
  const b = parseBundle(bundle)!;
  assert.ok(b);
  const all = new Set(b.items.flatMap((i) => i.tokens.map((t) => t.lemma)));
  const known = new Set(Array.from(all).filter((_, i) => i % 25 !== 0));
  const l: Learner = { p: (x) => (known.has(x) ? 1 : 0), due: new Set(), rank: () => null, recent: {}, lastVideo: null };
  const plans = planBundle(b, l);
  assert.equal(plans.length, b.units.length);
  const items = new Map(b.items.map((i) => [i.id, i]));
  const pick = select(plans, l, (id) => b.units.find((u) => u.id === id)!.itemIds.flatMap((x) => items.get(x)!.tokens.map((t) => t.lemma)));
  assert.ok(pick);
  assert.ok(pick!.plan.tokens >= MIN_UNIT_TOKENS);
});

test("loadBundle reads the manifest, rejects odd file names and survives a failed fetch", async () => {
  const files: Record<string, unknown> = { "/input/manifest.json": { langs: { es: { file: "es.6868a53514ef.json" }, fr: { file: "../secret.json" } } }, "/input/es.6868a53514ef.json": { format: "polingual-input", lang: "es", items: [], units: [] } };
  const fetcher = (async (u: string) => ({ json: async () => files[u] })) as unknown as typeof fetch;
  assert.equal((await loadBundle("es", "/input", fetcher))?.lang, "es");
  assert.equal(await loadBundle("fr", "/input", fetcher), null);
  assert.equal(await loadBundle("es", "/input", (async () => { throw new Error("down"); }) as unknown as typeof fetch), null);
});

test("equal scores pick the lowest unit id, matching the Lean model", () => {
  const l = learner({ p: {}, due: [], rank: {}, recent: {}, lastVideo: null });
  const mk = (unit: string) => ({ unit, tokens: 40, media: false, coverage: 0.96, newWords: ["a"], glossed: [], eligible: true, score: 1 });
  assert.equal(select([mk("u:b"), mk("u:a"), mk("u:c")], l, () => [])!.plan.unit, "u:a");
  assert.deepEqual(UNFITTED_SELECTOR_WEIGHTS, { due: 2, frequency: 1, repeat: 3, continuity: 1.5 });
});

test("the gloss budget is max(2, 5 percent of the unit)", () => {
  assert.equal(glossBudget(20), 2);
  assert.equal(glossBudget(40), 2);
  assert.equal(glossBudget(60), 3);
  assert.equal(glossBudget(100), 5);
});

const gv = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/graded-vectors.json"), "utf8"));

test("graded band items expand by code point and merge into the bundle", () => {
  for (const it of gv.bands[0].items as BandItem[]) {
    const x = expandBandItem(it);
    assert.deepEqual(x ? x.tokens.map((t) => [t.surface, t.lemma]) : null, gv.expanded[it.id], it.id);
  }
  const merged = mergeBands(gv.base as InputBundle, gv.bands);
  assert.deepEqual(merged.units.map((u) => u.id), gv.mergedUnits);
  assert.deepEqual(merged.items.map((i) => i.id).sort(), gv.mergedItems);
  for (const [k, want] of gv.bandsFor as [number, number[]][]) assert.deepEqual(bandsFor(k), want, String(k));
});

test("band urls come from the manifest and refuse loopback in production", () => {
  const m = { langs: { "zh-Hans": { file: "zh-Hans.4e30a68e39ea.json", graded: { files: { "500": [{ file: "zh-Hans.b500.p0.76b9c85a128a.json" }, { file: "../evil.json" }] } } } } };
  assert.deepEqual(bandFileUrls(m, "zh-Hans", [500, 1000], "https://cdn.example/x/", true), ["https://cdn.example/x/zh-Hans.b500.p0.76b9c85a128a.json"]);
  assert.deepEqual(bandFileUrls(m, "zh-Hans", [500], "http://localhost:9000", true), []);
  assert.deepEqual(bandFileUrls(m, "zh-Hans", [500], undefined, false), []);
});

test("loadBundle merges graded bands and keeps the bundle when a band fails", async () => {
  const files: Record<string, unknown> = {
    "/input/manifest.json": { langs: { es: { file: "es.32b6f1d49094.json", graded: { files: { "500": [{ file: "es.b500.p0.76b9c85a128a.json" }, { file: "es.b500.p1.76b9c85a128b.json" }] } } } } },
    "/input/es.32b6f1d49094.json": gv.base,
    "https://cdn.example/es.b500.p0.76b9c85a128a.json": gv.bands[0],
  };
  const fetcher = (async (u: string) => (u in files ? { ok: true, json: async () => files[u] } : { ok: false, json: async () => null })) as unknown as typeof fetch;
  const b = await loadBundle("es", "/input", fetcher, [500], "https://cdn.example", true);
  assert.deepEqual(b?.units.map((u) => u.id), gv.mergedUnits);
  const plain = await loadBundle("es", "/input", fetcher);
  assert.deepEqual(plain?.units.map((u) => u.id), ["base:u"]);
});
