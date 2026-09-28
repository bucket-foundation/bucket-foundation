import test from "node:test";
import assert from "node:assert/strict";
import { branchDepths, demonstratedKeys, gripFor, type AssessVerdict, type GripEdge, type GripNode } from "../src/lib/research-os/grip";

const node = (id: string, branch = "02-physics"): GripNode => ({ id, slug: `s-${id}`, title: `T ${id}`, branch, atomKey: `${branch}/${id}`, learnHref: null });
const DIAMOND = ["a", "b", "c", "t"].map((id) => node(id));
const DE: GripEdge[] = [
  { fromId: "a", toId: "b" },
  { fromId: "a", toId: "c" },
  { fromId: "b", toId: "t" },
  { fromId: "c", toId: "t" },
];
const keys = (...ids: string[]) => new Set(ids.map((i) => `02-physics/${i}`));

test("depth is the longest prerequisite chain from a root", () => {
  const d = branchDepths(DIAMOND, DE);
  assert.deepEqual(["a", "b", "c", "t"].map((i) => d.get(i)), [0, 1, 1, 2]);
  const chain = ["p", "q", "r", "s"].map((id) => node(id));
  const cd = branchDepths(chain, [{ fromId: "p", toId: "q" }, { fromId: "q", toId: "r" }, { fromId: "r", toId: "s" }, { fromId: "p", toId: "s" }]);
  assert.equal(cd.get("s"), 3);
});

test("radius counts only grounded depth, so a deep result over a gap does not inflate it", () => {
  const onlyTop = gripFor(DIAMOND, DE, keys("t"), ["02-physics"]).axes[0];
  assert.equal(onlyTop.radius, 0);
  assert.equal(onlyTop.coverage, 0.25);
  const half = gripFor(DIAMOND, DE, keys("a", "b", "t"), ["02-physics"]).axes[0];
  assert.equal(half.groundedDepth, 1);
  assert.equal(half.radius, 2 / 3);
  const full = gripFor(DIAMOND, DE, keys("a", "b", "c", "t"), ["02-physics"]).axes[0];
  assert.equal(full.radius, 1);
});

test("grip is the mean cube of the radii and ignores axis order", () => {
  const nodes = [...DIAMOND, ...["a", "b", "c", "t"].map((id) => node(`m${id}`, "01-mathematics"))];
  const edges = [...DE, ...DE.map((e) => ({ fromId: `m${e.fromId}`, toId: `m${e.toId}` }))];
  const demo = new Set([...Array.from(keys("a", "b", "c", "t")), "01-mathematics/ma"]);
  const g1 = gripFor(nodes, edges, demo, ["02-physics", "01-mathematics"]);
  const g2 = gripFor(nodes, edges, demo, ["01-mathematics", "02-physics"]);
  assert.equal(g1.grip, (1 + (1 / 3) ** 3) / 2);
  assert.equal(g1.grip, g2.grip);
  assert.equal(g1.demonstratedTotal, 5);
  assert.equal(g1.catalogTotal, 8);
});

test("missing prerequisites are the ready edge of the grounded region", () => {
  const axis = gripFor(DIAMOND, DE, keys("a"), ["02-physics"]).axes[0];
  assert.deepEqual(axis.missing.map((m) => m.id), ["b", "c"]);
  assert.deepEqual(gripFor(DIAMOND, DE, new Set(), ["02-physics"]).axes[0].missing.map((m) => m.id), ["a"]);
});

test("the latest auto-graded verdict decides; self-graded items never count", () => {
  const v = (atomKey: string, correct: boolean, at: string, autoGraded = true, order = 0): AssessVerdict => ({ atomKey, correct, autoGraded, at, order });
  const shown = demonstratedKeys([v("x", true, "2026-09-01"), v("x", false, "2026-09-02"), v("y", false, "2026-09-01"), v("y", true, "2026-09-03"), v("z", true, "2026-09-05", false), v("w", false, "2026-09-01", true, 0), v("w", true, "2026-09-01", true, 1)]);
  assert.deepEqual(Array.from(shown).sort(), ["w", "y"]);
});

test("an empty branch has zero radius and coverage", () => {
  const g = gripFor(DIAMOND, DE, new Set(), ["03-chemistry"]);
  assert.deepEqual([g.axes[0].radius, g.axes[0].coverage, g.grip], [0, 0, 0]);
});

test("cycles do not hang the depth walk", () => {
  const nodes = ["a", "b"].map((id) => node(id));
  const d = branchDepths(nodes, [{ fromId: "a", toId: "b" }, { fromId: "b", toId: "a" }]);
  assert.equal(d.size, 2);
});

import { toGripNode, verdictsFromEvents } from "../src/lib/research-os/grip-db";
import { inLaunchScope } from "../src/lib/research-os/launch-scope";
import { isLaunchStaff } from "../src/lib/research-os/launch-gate";

test("assess events map to verdict keys that match graph node keys", () => {
  const verdicts = verdictsFromEvents([
    { created_at: "2026-09-28T10:00:00Z", props: { branch: "05-biophysics", items: [{ atomId: "atp", level: "recall", correct: true, autoGraded: true }, { atomId: "atp", level: "apply", correct: false, autoGraded: true }] } },
    { created_at: "2026-09-28T10:30:00Z", props: { branch: "biophysics", items: [{ atomId: "nadh", level: "recall", correct: true, autoGraded: true }] } },
    { created_at: "2026-09-28T11:00:00Z", props: { branch: "02-physics", items: [{ atomId: 7 }] } },
    { created_at: "2026-09-28T12:00:00Z", props: null },
  ]);
  assert.deepEqual(verdicts.map((v) => [v.atomKey, v.correct, v.order]), [["05-biophysics/atp", true, 0], ["05-biophysics/atp", false, 1], ["05-biophysics/nadh", true, 0]]);
  assert.deepEqual(Array.from(demonstratedKeys(verdicts)), ["05-biophysics/nadh"]);
  const n = toGripNode({ id: "1", slug: "academy-biophysics-atp", title: "ATP", branch: "05-biophysics", provenance: { type: "academy_atom", atom_id: "atp", source: "learning/app/corpus/biophysics.json" }, visibility: null, owner_id: null });
  assert.equal(n?.atomKey, "05-biophysics/atp");
  assert.equal(n?.learnHref, "/research-os/learn/biophysics/atp");
  assert.equal(toGripNode({ id: "2", slug: "x", title: "x", branch: "02-physics", provenance: { type: "canon_claim" }, visibility: null, owner_id: null }), null);
});

test("the grip API sits outside launch scope, so only listed staff reach it", () => {
  assert.equal(inLaunchScope("/api/research-os/grip"), false);
  assert.equal(inLaunchScope("/research-os/grip"), false);
  const saved = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  process.env.RESEARCH_OS_REVIEWER_EMAILS = "staff@bucket.test";
  try {
    assert.equal(isLaunchStaff({ email: "staff@bucket.test" }), true);
    assert.equal(isLaunchStaff({ email: "learner@bucket.test" }), false);
    assert.equal(isLaunchStaff(null), false);
  } finally {
    if (saved === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = saved;
  }
});
