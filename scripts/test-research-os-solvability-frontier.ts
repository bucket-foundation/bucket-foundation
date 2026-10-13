import test from "node:test";
import assert from "node:assert/strict";
import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import similarity from "../src/lib/research-os/solvability-similarity-data.json";
import neighbors from "../src/lib/research-os/solvability-neighbors-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { CORE_RADIUS, FRONTIER_RADIUS, MIN_BRANCH_SOLVED, OUTER_RADIUS, REACH_QUANTILE, branchCounts, buildFrontier, edgeRanking, frontierRows, growthRanking, isNeighborData, quantile, similarityOf, type FrontierRow, type NeighborData, type NeighborNode, type SimilarityData } from "../src/lib/research-os/solvability-frontier";
import { FULL_LABELS, frontierSvg, frontierText, labelled } from "../src/lib/research-os/solvability-frontier-render";

const rows = (atlas as SolvabilityAtlasData).productions;
const data = similarity as SimilarityData;
const f = buildFrontier(rows, data);
const sampled = { minBranchSolved: 0 };

const row = (id: string, resolved: number | null, theta = 0): FrontierRow => ({ id, title: id, branch: "mathematics", theta, resolved, source_kind: "problem" });
const toy: SimilarityData = { schema: "t", ids: ["s1", "s2", "near", "far", "farther"], upper: [[0.9, 0.85, 0.3, 0.2], [0.6, 0.25, 0.2], [0.1, 0.1], [0.95], []] };
const toyRows = [row("s1", 1900), row("s2", 1950), row("near", null), row("far", null), row("farther", null)];

test("similarity reads the upper triangle both ways and knows a missing id", () => {
  const sim = similarityOf(toy);
  assert.equal(sim("s1", "near"), 0.85);
  assert.equal(sim("near", "s1"), 0.85);
  assert.equal(sim("far", "farther"), 0.95);
  assert.equal(sim("s1", "s1"), 1);
  assert.equal(sim("s1", "nobody"), null);
});

test("quantile picks by rank and refuses an empty list", () => {
  assert.equal(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1), 2);
  assert.equal(quantile([5], 0.9), 5);
  assert.throws(() => quantile([], 0.5));
});

test("a toy frontier puts each problem in its zone", () => {
  const t = buildFrontier(toyRows, toy, 0.8, sampled);
  const zone = Object.fromEntries(t.points.map((p) => [p.id, p.zone]));
  assert.deepEqual(zone, { s1: "solved", s2: "solved", near: "reachable", far: "beyond", farther: "beyond" });
  assert.deepEqual(t.counts, { solved: 2, reachable: 1, beyond: 2, unsampled: 0 });
  assert.equal(t.inside, 3);
  assert.equal(t.outside, 2);
});

test("solving an outside problem pulls its close outside neighbours inside", () => {
  const t = buildFrontier(toyRows, toy, 0.8, sampled);
  const far = t.points.find((p) => p.id === "far")!;
  assert.deepEqual(far.pulls, ["farther"]);
  assert.equal(far.growth, 2);
  const grown = buildFrontier(toyRows.map((r) => (r.id === "far" ? { ...r, resolved: 2026 } : r)), toy, 0.8, sampled);
  assert.equal(grown.inside, t.inside + far.growth);
});

test("growth predicts the inside count after solving any outside problem on the real atlas", () => {
  for (const p of growthRanking(f).slice(0, 8)) {
    const grown = buildFrontier(rows.map((r) => (r.id === p.id ? { ...r, resolved: 2026 } : r)), data, f.threshold);
    assert.equal(grown.inside, f.inside + p.growth, p.id);
  }
});

test("a problem with no similarity row is left off and named", () => {
  const t = buildFrontier([...toyRows, row("stray", null)], toy, 0.8, sampled);
  assert.deepEqual(t.missing, ["stray"]);
  assert.equal(t.points.length, toyRows.length);
  assert.ok(t.rule.endsWith("1 problem has no similarity row and is left off."));
  assert.deepEqual(f.missing, []);
});

test("the frontier needs two solved problems and a threshold between 0 and 1", () => {
  assert.throws(() => buildFrontier([row("s1", 1900), row("near", null)], toy));
  assert.throws(() => buildFrontier(toyRows, toy, 1, sampled));
  assert.throws(() => buildFrontier(toyRows, toy, 0, sampled));
});

test("the real atlas: every production lands, zones match the radius bands, counts add up", () => {
  assert.equal(f.points.length, rows.length);
  assert.equal(f.inside + f.outside, rows.length);
  for (const p of f.points) {
    assert.ok(Number.isFinite(p.radius) && p.reach > 0 && p.reach <= 1, p.id);
    if (p.zone === "solved") assert.ok(p.radius <= CORE_RADIUS, p.id);
    if (p.zone === "reachable") assert.ok(p.radius >= CORE_RADIUS && p.radius <= FRONTIER_RADIUS, p.id);
    if (p.zone === "beyond" || p.zone === "unsampled") assert.ok(p.radius > FRONTIER_RADIUS && p.radius <= OUTER_RADIUS, p.id);
    assert.equal(p.zone === "solved", rows.find((r) => r.id === p.id)!.resolved !== null, p.id);
    assert.notEqual(p.nearest?.id, p.id);
  }
});

test("the default threshold is the stated quantile of solved reach", () => {
  const solved = f.points.filter((p) => p.zone === "solved").map((p) => p.reach).sort((a, b) => a - b);
  assert.equal(f.threshold, quantile(solved, REACH_QUANTILE));
  assert.ok(f.rule.includes(String(f.threshold)));
});

test("a higher threshold never grows the inside", () => {
  const loose = buildFrontier(rows, data, 0.7);
  const tight = buildFrontier(rows, data, 0.9);
  assert.ok(loose.inside >= f.inside && f.inside >= tight.inside);
});

test("the build repeats and the rankings are total orders", () => {
  assert.deepEqual(buildFrontier(rows, data), f);
  assert.equal(growthRanking(f).length, f.counts.beyond);
  assert.equal(edgeRanking(f).length, f.counts.reachable + f.counts.beyond);
  assert.equal(f.points.length, Object.values(f.branches).reduce((n, c) => n + c.total, 0));
});

test("the svg draws one mark per point and escapes titles", () => {
  const svg = frontierSvg(f);
  assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
  const marks = (svg.match(/<circle cx="\d/g) ?? []).length + (svg.match(/<path d="M\d/g) ?? []).length;
  assert.equal(marks, f.points.length + 7);
  const odd = buildFrontier([...toyRows.slice(0, 2), { ...row("near", null), title: "a < b & c" }, ...toyRows.slice(3)], toy, 0.8, sampled);
  assert.ok(frontierSvg(odd).includes("a &lt; b &amp; c"));
});

test("the terminal drawing fits its width, tags each outside problem, and carries no colour unless asked", () => {
  const lines = frontierText(f, { width: 79 });
  assert.ok(lines.every((l) => !l.includes("\x1b")));
  const grid = lines.slice(3, 3 + 39);
  assert.ok(lines.every((l) => l.length <= 79));
  assert.ok(frontierText(f, { width: 41 }).every((l) => l.length <= 62));
  assert.ok(lines[0].startsWith("Solvability frontier:"));
  assert.ok(grid.join("").includes("#"));
  assert.equal(lines.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).length, f.counts.beyond);
  const narrow = frontierText(f, { width: 41 });
  assert.ok(narrow.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).every((l) => l.length <= 62));
  assert.ok(lines.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).every((l) => l.length <= 79));
  assert.ok(frontierText(f, { color: true }).some((l) => l.includes("\x1b[")));
});

const full = neighbors as unknown as NeighborData;
const fullRows = frontierRows(full);
const ff = buildFrontier(fullRows, full);

function sparse(ids: string[], sim: number[][], solved: boolean[], k: number, kind: NeighborNode["kind"][] = [], variantOf: (string | null)[] = []): NeighborData {
  const nodes = ids.map((id, i): NeighborNode => {
    const order = ids.map((_, j) => j).filter((j) => j !== i).sort((a, b) => sim[i][b] - sim[i][a]);
    const top = order.slice(0, k);
    const best = order.filter((j) => solved[j])[0];
    return { id, title: id, branch: "mathematics", kind: kind[i] ?? "sourced", form: "problem", variant_of: variantOf[i] ?? null, status: solved[i] ? "solved" : "open", solved: solved[i], resolved: null, theta: i, source: "t", licence: "t", text_kind: "statement", n: top, s: top.map((j) => sim[i][j]), solved_nearest: best === undefined ? null : { id: ids[best], sim: sim[i][best] } };
  });
  return { schema: "t", model: "t", revision: "t", k, note: "", solved_rule: "", text_counts: {}, ids, solved: ids.filter((_, i) => solved[i]), nodes };
}

const toyIds = ["s1", "s2", "near", "far", "farther"];
const toySim = [
  [1, 0.9, 0.85, 0.3, 0.2],
  [0.9, 1, 0.6, 0.25, 0.2],
  [0.85, 0.6, 1, 0.1, 0.1],
  [0.3, 0.25, 0.1, 1, 0.95],
  [0.2, 0.2, 0.1, 0.95, 1],
];
const toySparse = sparse(toyIds, toySim, [true, true, false, false, false], 4);

test("the sparse path repeats the dense toy frontier when every neighbour is stored", () => {
  assert.ok(isNeighborData(toySparse) && !isNeighborData(toy));
  const dense = buildFrontier(toyRows, toy, 0.8, sampled);
  const thin = buildFrontier(frontierRows(toySparse), toySparse, 0.8, sampled);
  assert.deepEqual(thin.counts, dense.counts);
  assert.deepEqual(thin.points.map((p) => [p.id, p.zone, p.reach, p.pulls, p.growth]), dense.points.map((p) => [p.id, p.zone, p.reach, p.pulls, p.growth]));
  assert.ok(thin.rule.includes("Pulls count only a problem's 4 stored neighbours."));
});

test("the sparse path bounds pulls by the stored neighbours and recomputes reach from them when a node is solved", () => {
  const one = sparse(toyIds, toySim, [true, true, false, false, false], 1);
  const t = buildFrontier(frontierRows(one), one, 0.8, sampled);
  const far = t.points.find((p) => p.id === "far")!;
  assert.deepEqual(far.pulls, ["farther"]);
  const grown = buildFrontier(frontierRows(one).map((r) => (r.id === "far" ? { ...r, solved: true } : r)), one, 0.8, sampled);
  assert.equal(grown.points.find((p) => p.id === "farther")!.zone, "reachable");
  assert.equal(grown.inside, t.inside + far.growth);
});

test("the sparse path refuses a node with no solved neighbour in reach", () => {
  const sim = [
    [1, 0.2, 0.1, 0.8],
    [0.2, 1, 0.9, 0.2],
    [0.1, 0.9, 1, 0.1],
    [0.8, 0.2, 0.1, 1],
  ];
  const thin = sparse(["a", "b", "c", "d"], sim, [true, true, false, true], 1);
  const rows = frontierRows(thin);
  assert.equal(buildFrontier(rows, thin, 0.5, sampled).points.find((p) => p.id === "c")!.nearest!.id, "b");
  assert.throws(() => buildFrontier(rows.map((r) => (r.id === "b" ? { ...r, solved: false } : r)), thin, 0.5, sampled), /c has no solved neighbour/);
});

test("lean theorems are left off the full set by default and in on request", () => {
  assert.ok(full.nodes.some((n) => n.kind === "lean"));
  assert.ok(fullRows.every((r) => r.source_kind !== "lean"));
  assert.equal(frontierRows(full, { lean: true }).length, full.nodes.length);
  assert.equal(fullRows.length, full.nodes.filter((n) => n.kind !== "lean").length);
});

test("the variant rule: a variant is solved only when it and its parent are solved", () => {
  const byId = new Map(full.nodes.map((n) => [n.id, n]));
  const status = (id: string) => byId.get(id)!.status;
  let proved = 0;
  for (const n of full.nodes) {
    if (n.kind !== "variant") continue;
    assert.ok(n.variant_of, n.id);
    const parentSolved = byId.get(n.variant_of!)!.solved;
    if (n.solved) assert.ok(parentSolved, n.id);
    if (n.status === "partial") {
      proved += 1;
      assert.ok(!n.solved && !parentSolved, n.id);
    }
  }
  assert.ok(proved > 0);
  for (const n of full.nodes) if (n.kind === "problem") assert.equal(n.solved, n.resolved !== null, n.id);
  assert.equal(status("poincare"), "solved");
  assert.ok(full.solved_rule.includes("variant"));
});

test("the full frontier: every row lands, the threshold is the stated quantile, counts add up by branch", () => {
  assert.equal(ff.points.length, fullRows.length);
  assert.deepEqual(ff.missing, []);
  assert.equal(ff.inside + ff.outside, fullRows.length);
  const solved = ff.points.filter((p) => p.zone === "solved").map((p) => p.reach).sort((a, b) => a - b);
  assert.equal(ff.threshold, quantile(solved, REACH_QUANTILE));
  const byBranch = branchCounts(ff);
  const total = Object.values(byBranch).reduce((s, c) => s + c.total, 0);
  assert.equal(total, ff.points.length);
  for (const p of ff.points) {
    assert.ok(p.reach > 0 && p.reach <= 1, p.id);
    if (p.zone === "beyond") assert.ok(p.radius > FRONTIER_RADIUS && p.radius <= OUTER_RADIUS, p.id);
    assert.ok(p.pulls.length <= full.k, p.id);
  }
  assert.deepEqual(buildFrontier(fullRows, full), ff);
});

test("the full drawing labels the top outside problems by growth and the atlas problems, with branch counts", () => {
  const names = labelled(ff, 80);
  const top = growthRanking(ff).slice(0, FULL_LABELS);
  for (const p of top) assert.ok(names.includes(p));
  for (const p of ff.points) if (p.sourceKind === "problem" && p.zone !== "solved") assert.ok(names.includes(p));
  const svg = frontierSvg(ff);
  assert.ok(svg.includes("mathematics: ") && svg.includes("problems-sourced.tsv") && svg.includes("Apache-2.0") && svg.includes("CC BY-SA 4.0"));
  const m = ff.branches.mathematics;
  assert.ok(svg.includes(`${m.solved + m.reachable} of the ${ff.inside} inside are mathematics`));
  assert.ok(svg.includes("9. Per branch, inside and outside"));
  const marks = (svg.match(/<circle cx="\d/g) ?? []).length + (svg.match(/<path d="M\d/g) ?? []).length;
  assert.equal(marks, ff.points.length + 7 + Object.keys(branchCounts(ff)).length);
  const lines = frontierText(ff, { width: 79, list: 10 });
  assert.ok(lines.every((l) => l.length <= 79));
  assert.ok(lines.some((l) => l.startsWith("Per branch:")));
  assert.equal(lines.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).length, 10);
});

test("an open problem in a branch with few solved entries is unsampled, grey outside the circle, and pulls nothing", () => {
  const ids = ["m1", "m2", "m3", "p1", "p2", "q1"];
  const sim: number[][] = ids.map((_, i) => ids.map((_, j) => (i === j ? 1 : 0.9)));
  sim[2][5] = sim[5][2] = 0.96;
  const branch = (id: string) => (id.startsWith("p") ? "physics" : "mathematics") as FrontierRow["branch"];
  const thin = sparse(ids, sim, [true, true, false, true, false, false], 5);
  const rows = frontierRows(thin).map((r) => ({ ...r, branch: branch(r.id) }));
  const t = buildFrontier(rows, thin, 0.95, { minBranchSolved: 2 });
  const zone = Object.fromEntries(t.points.map((p) => [p.id, p.zone]));
  assert.deepEqual(zone, { m1: "solved", m2: "solved", m3: "beyond", p1: "solved", p2: "unsampled", q1: "beyond" });
  assert.equal(t.outside, 3);
  assert.equal(t.counts.unsampled, 1);
  const p2 = t.points.find((p) => p.id === "p2")!;
  assert.deepEqual(p2.pulls, []);
  assert.equal(p2.growth, 0);
  assert.ok(p2.radius > FRONTIER_RADIUS && p2.radius <= OUTER_RADIUS);
  assert.deepEqual(t.points.find((p) => p.id === "m3")!.pulls, ["q1"]);
  assert.equal(t.branches.physics.unsampled, 1);
  assert.ok(t.gaps.includes("physics 1 of 2"));
  assert.ok(growthRanking(t).every((p) => p.zone === "beyond"));
  assert.equal(buildFrontier(rows, thin, 0.95, { minBranchSolved: 1 }).counts.unsampled, 0);
  assert.equal(MIN_BRANCH_SOLVED, 10);
  const thinBranches = Object.entries(ff.branches).filter(([, c]) => c.solved < MIN_BRANCH_SOLVED);
  for (const [b, c] of thinBranches) assert.equal(c.beyond + c.reachable, 0, b);
  assert.equal(ff.gaps.includes("mind "), thinBranches.some(([b]) => b === "mind"));
});

test("variants neither pull nor count as pulled, and the growth ranking lists top-level problems only", () => {
  const ids = ["s1", "s2", "a", "v", "b"];
  const sim = [
    [1, 0.9, 0.2, 0.2, 0.2],
    [0.9, 1, 0.2, 0.2, 0.2],
    [0.2, 0.2, 1, 0.95, 0.9],
    [0.2, 0.2, 0.95, 1, 0.9],
    [0.2, 0.2, 0.9, 0.9, 1],
  ];
  const thin = sparse(ids, sim, [true, true, false, false, false], 4, ["sourced", "sourced", "sourced", "variant", "sourced"], [null, null, null, "a", null]);
  const t = buildFrontier(frontierRows(thin), thin, 0.8, sampled);
  const by = Object.fromEntries(t.points.map((p) => [p.id, p]));
  assert.deepEqual(by.a.pulls, ["b"]);
  assert.equal(by.a.growth, 2);
  assert.deepEqual(by.v.pulls, []);
  assert.equal(by.v.growth, 0);
  assert.equal(by.v.zone, "beyond");
  assert.deepEqual(growthRanking(t).map((p) => p.id), ["a", "b"]);
  assert.ok(t.rule.includes("Variants neither pull nor count as pulled."));
  for (const p of ff.points) if (p.sourceKind === "variant") assert.equal(p.growth, 0, p.id);
  for (const p of ff.points) for (const id of p.pulls) assert.notEqual(full.nodes.find((n) => n.id === id)!.kind, "variant", p.id);
  assert.ok(growthRanking(ff).slice(0, 40).every((p) => p.sourceKind !== "variant"));
  assert.ok(labelled(ff, 80).every((p) => p.sourceKind !== "variant"));
  assert.ok(labelled(ff, 80).filter((p) => p.sourceKind === "problem").length === ff.points.filter((p) => p.sourceKind === "problem").length);
});
