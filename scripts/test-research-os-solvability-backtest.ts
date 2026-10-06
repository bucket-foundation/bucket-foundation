import test from "node:test";
import assert from "node:assert/strict";
import neighbors from "../src/lib/research-os/solvability-neighbors-data.json";
import { LENGTH_BANDS, auc, backtest, backtestCutoff, lengthBand, permutationP, seededRandom, shuffleInPlace, stratum, type BacktestRow } from "../src/lib/research-os/solvability-backtest";
import { buildFrontier, frontierRows, type NeighborData, type NeighborNode } from "../src/lib/research-os/solvability-frontier";
import { buildPredictions, classify, predictionsCsv, rankPredictions, topPerClass } from "../src/lib/research-os/solvability-predictions";

const data = neighbors as unknown as NeighborData;

function node(id: string, i: number, all: string[], sims: Record<string, number>, extra: Partial<NeighborNode>): NeighborNode {
  const others = all.filter((o) => o !== id);
  const n = others.map((o) => all.indexOf(o));
  const s = others.map((o) => sims[[id, o].sort().join("|")] ?? 0.1);
  const order = n.map((_, k) => k).sort((a, b) => s[b] - s[a]);
  return { id, title: id, branch: "mathematics", kind: "sourced", form: "problem", variant_of: null, status: "open", solved: false, resolved: null, posed: 1990, words: 10, theta: i, source: "", licence: "", text_kind: "statement", n: order.map((k) => n[k]), s: order.map((k) => s[k]), solved_nearest: null, ...extra };
}

function toy(): NeighborData {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const sims = { "a|b": 0.9, "a|c": 0.85, "b|c": 0.8, "a|d": 0.3, "b|d": 0.2, "c|d": 0.3, "a|e": 0.88, "b|e": 0.7, "c|e": 0.6, "d|e": 0.2, "a|f": 0.75, "b|f": 0.7, "c|f": 0.7, "d|f": 0.2, "e|f": 0.6 };
  const nodes = [
    node("a", 0, ids, sims, { solved: true, status: "solved", resolved: 1950 }),
    node("b", 1, ids, sims, { solved: true, status: "solved", resolved: 1960 }),
    node("c", 2, ids, sims, { solved: true, status: "solved", resolved: 2010 }),
    node("d", 3, ids, sims, { status: "open", words: 50 }),
    node("e", 4, ids, sims, { status: "partial", words: 25 }),
    node("f", 5, ids, sims, { status: "open", posed: 2015 }),
  ];
  return { schema: "t", model: "m", revision: "r", k: 5, note: "", solved_rule: "", text_counts: {}, ids, solved: ["a", "b", "c"], nodes };
}

test("length bands split at 20 and 40 words", () => {
  assert.equal(lengthBand(19), LENGTH_BANDS[0]);
  assert.equal(lengthBand(20), LENGTH_BANDS[1]);
  assert.equal(lengthBand(40), LENGTH_BANDS[1]);
  assert.equal(lengthBand(41), LENGTH_BANDS[2]);
});

test("the seeded generator and shuffle repeat", () => {
  const a = seededRandom(7);
  const b = seededRandom(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.deepEqual(shuffleInPlace([1, 2, 3, 4, 5], seededRandom(3)), shuffleInPlace([1, 2, 3, 4, 5], seededRandom(3)));
});

test("a toy cutoff uses only problems solved by then and scores 2026 outcomes", () => {
  const c = backtestCutoff(toy(), 2000, { permutations: 200, minBranchSolved: 2, floor: 1 });
  assert.equal(c.solvedAtCutoff, 2);
  assert.equal(c.threshold, 0.9);
  const byId = Object.fromEntries(c.rows.map((r) => [r.id, r]));
  assert.deepEqual(Object.keys(byId).sort(), ["c", "d", "e"]);
  assert.equal(byId.c.reach, 0.85);
  assert.equal(byId.c.inside, false);
  assert.equal(byId.c.resolved, true);
  assert.equal(byId.e.resolved, true);
  assert.equal(byId.d.resolved, false);
  assert.equal(byId.d.reach, 0.3);
  assert.equal(c.tested, 3);
  assert.equal(c.all.inside + c.all.outside, 3);
});

test("the stratum floor hides rates below ten rows a side", () => {
  const row = (id: string, inside: boolean, resolved: boolean): BacktestRow => ({ id, title: id, branch: "physics", posed: 1900, words: 10, reach: 0.5, reachBounded: false, inside, decided: true, sampled: true, resolved, status: resolved ? "solved" : "open" });
  const small = stratum("small", [row("1", true, true), row("2", false, false)], 100, 1);
  assert.equal(small.belowFloor, true);
  assert.equal(small.rateInside, null);
  assert.equal(small.pValue, null);
  assert.equal(small.inside, 1);
  const rows = [...Array(12)].flatMap((_, i) => [row(`i${i}`, true, i < 9), row(`o${i}`, false, i < 3)]);
  const big = stratum("big", rows, 2000, 1);
  assert.equal(big.belowFloor, false);
  assert.equal(big.rateInside, 0.75);
  assert.equal(big.rateOutside, 0.25);
  assert.equal(big.ratio, 3);
  assert.ok(big.pValue! < 0.05);
});

test("the permutation p-value is one for equal rates and small for a clean split", () => {
  const same = permutationP([true, false, true, false], [true, false, true, false], 500, 1);
  assert.equal(same, 1);
  const split = permutationP(Array(30).fill(true), Array(30).fill(false), 2000, 1);
  assert.ok(split < 0.01);
  assert.equal(permutationP([true, false], [false, true], 300, 5), permutationP([true, false], [false, true], 300, 5));
});

test("auc is one for a perfect score, one half for a tie, and null without both outcomes", () => {
  assert.equal(auc([0.9, 0.8, 0.2, 0.1], [true, true, false, false]), 1);
  assert.equal(auc([0.5, 0.5], [true, false]), 0.5);
  assert.equal(auc([0.5, 0.6], [true, true]), null);
});

test("the real backtest is deterministic and states its sizes", () => {
  const a = backtest(data, [2005, 2021], { permutations: 300 });
  const b = backtest(data, [2005, 2021], { permutations: 300 });
  assert.deepEqual(a, b);
  for (const c of a.cutoffs) {
    assert.ok(c.solvedAtCutoff >= 2);
    assert.equal(c.all.inside + c.all.outside + c.unsampled + c.undecided, c.tested);
    for (const s of [...c.byLength, ...c.byBranch]) if (s.belowFloor) assert.equal(s.rateInside, null);
    assert.equal(c.byLength.reduce((n, s) => n + s.inside + s.outside, 0), c.all.inside + c.all.outside);
    for (const r of c.rows) assert.ok(r.posed <= c.cutoff);
  }
});

test("predictions classify by zone and the upper reach, rank by growth, and keep the atlas problems", () => {
  const f = buildFrontier(frontierRows(data), data);
  const p = buildPredictions(f, data, { collatz: [{ title: "A work", year: 2000, role: "posed", doi: null }] });
  assert.equal(classify({ zone: "solved", reach: 1 }, 0.8), null);
  assert.equal(classify({ zone: "reachable", reach: 0.85 }, 0.8), "AI can reach with known results");
  assert.equal(classify({ zone: "reachable", reach: 0.79 }, 0.8), "borderline");
  assert.equal(classify({ zone: "beyond", reach: 0.5 }, 0.8), "needs a new idea");
  assert.equal(classify({ zone: "unsampled", reach: 0.5 }, 0.8), "unsampled");
  const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
  assert.equal(total, p.rows.length);
  assert.equal(p.rows.filter((r) => r.sourceKind === "variant").length, 0);
  assert.ok(p.upperReach >= p.threshold);
  for (const r of p.rows) assert.ok(r.nearest.length <= 3 && r.nearest.every((n) => n.similarity <= 1));
  const top = topPerClass(p, 50);
  for (const rows of Object.values(top)) assert.ok(rows.length <= 50);
  assert.deepEqual(rankPredictions(p.rows).map((r) => r.id), p.rows.map((r) => r.id));
  const atlas = p.rows.filter((r) => r.atlas);
  assert.ok(atlas.length > 20);
  assert.ok(p.rows.find((r) => r.id === "collatz")?.works.length === 1);
  const csv = predictionsCsv(p);
  assert.equal(csv.split("\n").length, p.rows.length + 2);
  assert.match(csv, /^id,title,branch,status,class,reach,growth/);
});
