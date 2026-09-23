import { strict as assert } from "node:assert";
import { test } from "node:test";
import { directionsFrom, isFrontierNode } from "../src/lib/research-os/directions";
import type { GraphEdge, GraphNode } from "../src/lib/research-os/types";

const n = (id: string, extra: Partial<GraphNode> = {}): GraphNode => ({ id, slug: id, title: id, kind: "concept", tier: 0, branch: "02-physics", summary: null, provenance: { type: "reference" }, ...extra });
const e = (from: string, to: string, kind: GraphEdge["kind"] = "prerequisite"): GraphEdge => ({ fromId: from, toId: to, kind });

const nodes = [n("light"), n("scattering"), n("rayleigh"), n("sunset"), n("sky-blue-hypothesis", { kind: "hypothesis" }), n("why-red", { frontierFlag: "open_question" }), n("unrelated")];
const edges = [e("light", "scattering"), e("scattering", "rayleigh"), e("scattering", "sunset"), e("sky-blue-hypothesis", "rayleigh", "extends"), e("scattering", "why-red"), e("sunset", "light", "cites")];

test("dependents are one step forward along prerequisite-like edges", () => {
  const d = directionsFrom("scattering", nodes, edges);
  assert.deepEqual(d.dependents.map((x) => x.id).sort(), ["rayleigh", "sunset", "why-red"]);
});

test("reach counts nodes per depth and stops at the depth limit", () => {
  const d = directionsFrom("light", nodes, edges, 3);
  assert.deepEqual(d.reach, [1, 3, 1]);
  const shallow = directionsFrom("light", nodes, edges, 1);
  assert.deepEqual(shallow.reach, [1]);
  assert.deepEqual(directionsFrom("unrelated", nodes, edges).reach, [0, 0, 0]);
});

test("frontier and open questions reachable forward", () => {
  const d = directionsFrom("light", nodes, edges);
  assert.deepEqual(d.frontier.map((x) => x.id), ["sky-blue-hypothesis"]);
  assert.deepEqual(d.openQuestions.map((x) => x.id), ["why-red"]);
  assert.equal(isFrontierNode(n("x", { frontierFlag: "frontier" })), true);
  assert.equal(isFrontierNode(n("x", { kind: "replication" })), true);
  assert.equal(isFrontierNode(n("x")), false);
});

test("cites edges do not count as forward and cycles do not loop", () => {
  const d = directionsFrom("sunset", nodes, edges);
  assert.deepEqual(d.dependents, []);
  assert.deepEqual(d.reach, [0, 0, 0]);
});

test("derives_from and extends run from the newer node to its base, so forward goes base to newer, and stops at evidence", () => {
  const ns = [n("kinematics"), n("fact", { kind: "fact" }), n("ext", { kind: "extension" }), n("dyn"), n("vectors")];
  const es = [
    e("fact", "kinematics", "derives_from"),
    e("ext", "kinematics", "extends"),
    e("dyn", "kinematics", "derives_from"),
    e("kinematics", "vectors", "derives_from"),
  ];
  const d = directionsFrom("kinematics", ns, es);
  assert.deepEqual(d.dependents.map((x) => x.id).sort(), ["dyn", "ext"], "a fact is evidence, and the walk stops at it");
  assert.deepEqual(directionsFrom("dyn", ns, es).dependents, [], "a node that derives from another does not lead to it");
  assert.deepEqual(directionsFrom("vectors", ns, es).dependents.map((x) => x.id), ["kinematics"]);
});

test("grouping nodes such as canon tags stay out of where knowledge leads", () => {
  const ns = [n("kinematics"), n("tag", { provenance: { type: "canon_concept" } }), n("dyn")];
  const es = [e("tag", "kinematics", "derives_from"), e("dyn", "kinematics", "derives_from")];
  assert.deepEqual(directionsFrom("kinematics", ns, es).dependents.map((x) => x.id), ["dyn"]);
});

test("open questions from intake show as endpoints and the walk ends at them", () => {
  const ns = [
    n("chemiosmosis"),
    n("why-atp", { provenance: { type: "intake_target" }, frontierFlag: "open_question" }),
    n("beyond", { provenance: { type: "intake_target" } }),
    n("after-question"),
    n("site", { kind: "fact" }),
  ];
  const es = [
    e("why-atp", "chemiosmosis", "derives_from"),
    e("beyond", "chemiosmosis", "derives_from"),
    e("after-question", "why-atp", "derives_from"),
    e("site", "chemiosmosis", "derives_from"),
  ];
  const d = directionsFrom("chemiosmosis", ns, es);
  assert.deepEqual(d.dependents.map((x) => x.id), ["why-atp"], "an unflagged intake target and a fact stay out");
  assert.deepEqual(d.openQuestions.map((x) => x.id), ["why-atp"]);
  assert.deepEqual(d.reach, [1, 0, 0], "the walk lists the question and goes no further");
  const fromQuestion = directionsFrom("why-atp", ns, es);
  assert.deepEqual(fromQuestion.dependents.map((x) => x.id), ["after-question"], "from the question's own page the walk still starts");
});

test("a flagged idea stays walkable", () => {
  const ns = [n("a"), n("b", { frontierFlag: "frontier" }), n("c")];
  const es = [e("a", "b"), e("b", "c")];
  const d = directionsFrom("a", ns, es);
  assert.deepEqual(d.frontier.map((x) => x.id), ["b"]);
  assert.deepEqual(d.reach, [1, 1, 0]);
});
