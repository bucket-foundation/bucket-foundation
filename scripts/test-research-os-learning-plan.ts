import test from "node:test";
import assert from "node:assert/strict";
import { checkCertificate, closureOrder, explanatoryChain, planPath, type Parents } from "../src/lib/research-os/learning-plan";

function graph(spec: Record<string, string[]>): Parents {
  return new Map(Object.entries(spec));
}

function stateDistance(parents: Parents, target: string, mastery: Set<string>): number | null {
  const key = (s: Set<string>) => Array.from(s).sort().join(",");
  const seen = new Set([key(mastery)]);
  let layer = [new Set(mastery)];
  for (let d = 0; layer.length > 0; d++) {
    const next: Set<string>[] = [];
    for (const known of layer) {
      if (known.has(target)) return d;
      for (const [v, ps] of Array.from(parents.entries())) {
        if (known.has(v) || !ps.every((p) => known.has(p))) continue;
        const s = new Set(known).add(v);
        const k = key(s);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(s);
        }
      }
    }
    layer = next;
  }
  return null;
}

const DIAMOND = graph({ "0": [], "1": ["0"], "2": ["0"], "3": ["1", "2"], "4": [] });

test("every DAG on up to five nodes matches the exhaustive knowledge-state search", () => {
  let cases = 0;
  let dags = 0;
  for (let n = 1; n <= 5; n++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    for (let bits = 0; bits < 1 << pairs.length; bits++) {
      const spec: Record<string, string[]> = {};
      for (let i = 0; i < n; i++) spec[String(i)] = [];
      pairs.forEach(([p, v], k) => {
        if (bits & (1 << k)) spec[String(v)].push(String(p));
      });
      const parents = graph(spec);
      dags++;
      for (let mask = 0; mask < 1 << n; mask++) {
        const mastery = new Set(Array.from({ length: n }, (_, i) => String(i)).filter((_, i) => mask & (1 << i)));
        if (Array.from(mastery).some((v) => !spec[v].every((p) => mastery.has(p)))) continue;
        for (let t = 0; t < n; t++) {
          const target = String(t);
          const r = planPath(parents, target, mastery);
          assert.equal(r.status, "ready");
          if (r.status !== "ready") continue;
          assert.equal(r.studyOrder.length, stateDistance(parents, target, mastery));
          assert.ok(checkCertificate(parents, new Set(r.mastered), target, r.studyOrder, r.remaining));
          cases++;
        }
      }
    }
  }
  assert.equal(dags, 1099);
  assert.equal(cases, 57060);
});

test("the named fixtures from the learning-system analysis", () => {
  const d = planPath(DIAMOND, "3", new Set());
  assert.ok(d.status === "ready");
  if (d.status === "ready") {
    assert.deepEqual(d.studyOrder, ["0", "1", "2", "3"]);
    assert.ok(!d.studyOrder.includes("4"));
  }
  const s = planPath(graph({ "0": [], "1": ["0"], "2": ["0", "1"] }), "2", new Set());
  assert.ok(s.status === "ready" && s.studyOrder.join() === "0,1,2");
  const m = planPath(DIAMOND, "3", new Set(["0", "1", "2", "3"]));
  assert.ok(m.status === "ready" && m.studyOrder.length === 0 && m.remaining.length === 0);
  const root = planPath(graph({ "0": [] }), "0", new Set());
  assert.ok(root.status === "ready" && root.studyOrder.join() === "0");
  assert.equal(planPath(graph({ "0": ["1"], "1": ["0"] }), "1", new Set()).status, "cycle");
  assert.deepEqual(planPath(DIAMOND, "3", new Set(["3"])), { status: "mastery_conflict", target: "3", nodes: ["3"] });
  assert.equal(planPath(graph({ "0": ["1"] }), "0", new Set()).status, "missing_node");
  assert.equal(planPath(graph({}), "x", new Set()).status, "missing_node");
});

test("inconsistent mastery outside the target closure is ignored and not reported", () => {
  const disjoint = graph({ "0": [], "1": ["0"], "2": ["0"], "3": ["1", "2"], "4": [], "5": ["4"] });
  const r = planPath(disjoint, "3", new Set(["5"]));
  assert.ok(r.status === "ready");
  if (r.status === "ready") {
    assert.deepEqual(r.studyOrder, ["0", "1", "2", "3"]);
    assert.deepEqual(r.mastered, []);
  }
});

test("the explanatory chain is the shortest backward line with stable tie-breaks, and it is not a study plan", () => {
  const closure = new Set(["0", "1", "2", "3"]);
  assert.deepEqual(explanatoryChain(DIAMOND, "3", closure), ["0", "1", "3"]);
  const chainAsPlan = ["0", "1", "3"];
  assert.ok(!checkCertificate(DIAMOND, new Set(), "3", chainAsPlan, chainAsPlan));
  const shortcut = graph({ a: [], b: ["a"], c: ["b"], t: ["c", "a"] });
  assert.deepEqual(explanatoryChain(shortcut, "t", new Set(["a", "b", "c", "t"])), ["a", "t"]);
});

test("ready nodes are the unmet nodes whose prerequisites are all mastered", () => {
  const r = planPath(DIAMOND, "3", new Set(["0", "1"]));
  assert.ok(r.status === "ready");
  if (r.status === "ready") {
    assert.deepEqual(r.ready, ["2"]);
    assert.deepEqual(r.studyOrder, ["2", "3"]);
  }
});

test("the closure walk stops at the node cap and handles deep chains without recursion", () => {
  const spec: Record<string, string[]> = { n0: [] };
  for (let i = 1; i < 20000; i++) spec[`n${i}`] = [`n${i - 1}`];
  const deep = graph(spec);
  assert.equal(planPath(deep, "n19999", new Set(), 100).status, "limit");
  const big = closureOrder(deep, "n19999", 30000);
  assert.ok("order" in big && big.order.length === 20000 && big.order[0] === "n0");
});

test("certificates reject missing, repeated, unready and non-target orders", () => {
  const rem = ["0", "1", "2", "3"];
  assert.ok(checkCertificate(DIAMOND, new Set(), "3", rem, rem));
  assert.ok(!checkCertificate(DIAMOND, new Set(), "3", ["1", "0", "2", "3"], rem));
  assert.ok(!checkCertificate(DIAMOND, new Set(), "3", ["0", "1", "2"], rem));
  assert.ok(!checkCertificate(DIAMOND, new Set(), "3", ["0", "0", "2", "3"], rem));
});
