import test from "node:test";
import assert from "node:assert/strict";
import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import similarity from "../src/lib/research-os/solvability-similarity-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { CORE_RADIUS, FRONTIER_RADIUS, OUTER_RADIUS, REACH_QUANTILE, buildFrontier, edgeRanking, growthRanking, quantile, similarityOf, type FrontierRow, type SimilarityData } from "../src/lib/research-os/solvability-frontier";
import { frontierSvg, frontierText } from "../src/lib/research-os/solvability-frontier-render";

const rows = (atlas as SolvabilityAtlasData).productions;
const data = similarity as SimilarityData;
const f = buildFrontier(rows, data);

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
  const t = buildFrontier(toyRows, toy, 0.8);
  const zone = Object.fromEntries(t.points.map((p) => [p.id, p.zone]));
  assert.deepEqual(zone, { s1: "solved", s2: "solved", near: "reachable", far: "beyond", farther: "beyond" });
  assert.deepEqual(t.counts, { solved: 2, reachable: 1, beyond: 2 });
  assert.equal(t.inside, 3);
  assert.equal(t.outside, 2);
});

test("solving an outside problem pulls its close outside neighbours inside", () => {
  const t = buildFrontier(toyRows, toy, 0.8);
  const far = t.points.find((p) => p.id === "far")!;
  assert.deepEqual(far.pulls, ["farther"]);
  assert.equal(far.growth, 2);
  const grown = buildFrontier(toyRows.map((r) => (r.id === "far" ? { ...r, resolved: 2026 } : r)), toy, 0.8);
  assert.equal(grown.inside, t.inside + far.growth);
});

test("growth predicts the inside count after solving any outside problem on the real atlas", () => {
  for (const p of growthRanking(f).slice(0, 8)) {
    const grown = buildFrontier(rows.map((r) => (r.id === p.id ? { ...r, resolved: 2026 } : r)), data, f.threshold);
    assert.equal(grown.inside, f.inside + p.growth, p.id);
  }
});

test("a problem with no similarity row is left off and named", () => {
  const t = buildFrontier([...toyRows, row("stray", null)], toy, 0.8);
  assert.deepEqual(t.missing, ["stray"]);
  assert.equal(t.points.length, toyRows.length);
  assert.ok(t.rule.endsWith("1 problem has no similarity row and is left off."));
  assert.deepEqual(f.missing, []);
});

test("the frontier needs two solved problems and a threshold between 0 and 1", () => {
  assert.throws(() => buildFrontier([row("s1", 1900), row("near", null)], toy));
  assert.throws(() => buildFrontier(toyRows, toy, 1));
  assert.throws(() => buildFrontier(toyRows, toy, 0));
});

test("the real atlas: every production lands, zones match the radius bands, counts add up", () => {
  assert.equal(f.points.length, rows.length);
  assert.equal(f.inside + f.outside, rows.length);
  for (const p of f.points) {
    assert.ok(Number.isFinite(p.radius) && p.reach > 0 && p.reach <= 1, p.id);
    if (p.zone === "solved") assert.ok(p.radius <= CORE_RADIUS, p.id);
    if (p.zone === "reachable") assert.ok(p.radius >= CORE_RADIUS && p.radius <= FRONTIER_RADIUS, p.id);
    if (p.zone === "beyond") assert.ok(p.radius > FRONTIER_RADIUS && p.radius <= OUTER_RADIUS, p.id);
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
  assert.equal(growthRanking(f).length, f.outside);
  assert.equal(edgeRanking(f).length, f.counts.reachable + f.counts.beyond);
});

test("the svg draws one mark per point and escapes titles", () => {
  const svg = frontierSvg(f);
  assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
  const marks = (svg.match(/<circle cx="\d/g) ?? []).length + (svg.match(/<path d="M\d/g) ?? []).length;
  assert.equal(marks, f.points.length + 6);
  const odd = buildFrontier([...toyRows.slice(0, 2), { ...row("near", null), title: "a < b & c" }, ...toyRows.slice(3)], toy, 0.8);
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
  assert.equal(lines.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).length, f.outside);
  const narrow = frontierText(f, { width: 41 });
  assert.ok(narrow.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).every((l) => l.length <= 62));
  assert.ok(lines.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).every((l) => l.length <= 79));
  assert.ok(frontierText(f, { color: true }).some((l) => l.includes("\x1b[")));
});
