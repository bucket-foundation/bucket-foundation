import test from "node:test";
import assert from "node:assert/strict";
import type { Hit } from "../src/lib/explore/search";
import { groupEdges } from "../src/lib/stage/links";
import { readSharedCamera, resetSharedCamera, writeSharedCamera } from "../src/lib/stage/pose";
import { sortHits, thetaBySort } from "../src/lib/stage/sort";
import type { Edge } from "../src/lib/stage/record";

const hit = (id: string, score: number, year: number | null, branch: string): Hit => ({ id, type: "excerpt", title: id, subtitle: "", text: "", score, branch, year, url: null, links: [] });
const HITS = [hit("b", 0.5, 1990, "02-physics"), hit("a", 0.9, null, "01-mathematics"), hit("c", 0.7, 1900, "05-biophysics")];

test("sorters order hits by relevance, year and branch", () => {
  assert.deepEqual(sortHits(HITS, "relevance").map((h) => h.id), ["a", "c", "b"]);
  assert.deepEqual(sortHits(HITS, "year").map((h) => h.id), ["c", "b", "a"]);
  assert.deepEqual(sortHits(HITS, "branch").map((h) => h.id), ["a", "b", "c"]);
});

test("theta follows the sort order around the circle", () => {
  const t = thetaBySort(HITS, "year");
  assert.equal(t.get("c"), 0);
  assert.ok((t.get("b") as number) > 0 && (t.get("a") as number) > (t.get("b") as number));
  assert.ok(Array.from(t.values()).every((v) => v >= 0 && v < Math.PI * 2));
});

test("links group by kind in the fixed kind order", () => {
  const edges: Edge[] = [
    { to: "x", kind: "shares-token", reason: "r", weight: 1 },
    { to: "y", kind: "advises", reason: "r", weight: 1 },
    { to: "z", kind: "shares-token", reason: "r", weight: 1 },
  ];
  const g = groupEdges(edges);
  assert.deepEqual(g.map((x) => x.kind), ["shares-token", "advises"]);
  assert.deepEqual(g[0].edges.map((e) => e.to), ["x", "z"]);
  assert.deepEqual(groupEdges([]), []);
});

test("the shared camera keeps the pose and lock across mode switches", () => {
  resetSharedCamera();
  assert.equal(readSharedCamera().pose, null);
  writeSharedCamera({ position: [3, 1, 2], target: [0, 0, 0], fov: 45 }, false);
  const a = readSharedCamera();
  assert.deepEqual(a.pose?.position, [3, 1, 2]);
  assert.equal(a.locked, false);
  a.pose!.position[0] = 99;
  assert.equal(readSharedCamera().pose?.position[0], 3);
  resetSharedCamera();
});
