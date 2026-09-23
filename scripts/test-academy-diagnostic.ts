import test from "node:test";
import assert from "node:assert/strict";
import { Diagnostic, buildClosures } from "../src/lib/academy/diagnostic";
import { withLeverage, type Atom } from "../src/lib/academy/engine";

const q = (id: string) => [{ level: "recall", prompt: `${id}?`, answer: id }];
const chain: Atom[] = withLeverage([
  { id: "a", title: "A", requires: [], quiz: q("a") },
  { id: "b", title: "B", requires: ["a"], quiz: q("b") },
  { id: "c", title: "C", requires: ["b"], quiz: q("c") },
  { id: "d", title: "D", requires: ["c"], quiz: q("d") },
  { id: "e", title: "E", requires: ["d"], quiz: q("e") },
]);

test("closures follow the chain both ways and the middle is most central", () => {
  const c = buildClosures(chain);
  assert.deepEqual(Array.from(c.reqC.get("e")!).sort(), ["a", "b", "c", "d"]);
  assert.deepEqual(Array.from(c.unlC.get("a")!).sort(), ["b", "c", "d", "e"]);
  assert.equal(c.between.get("c"), 1);
});

test("an expert places the whole chain from one confident answer at the top", () => {
  const d = new Diagnostic(chain);
  const r = d.simulate(() => ({ correct: true }));
  assert.ok(r.questionsAsked <= 3, `asked ${r.questionsAsked}`);
  assert.deepEqual(r.known.sort(), ["a", "b", "c", "d", "e"]);
});

test("a beginner places nothing and the diagnostic stops early", () => {
  const d = new Diagnostic(chain);
  const r = d.simulate(() => ({ correct: false }));
  assert.ok(r.questionsAsked <= 3, `asked ${r.questionsAsked}`);
  assert.deepEqual(r.known, []);
});

test("someone who knows the base and not the top is placed at the middle", () => {
  const d = new Diagnostic(chain);
  const knows = new Set(["a", "b"]);
  const r = d.simulate((item) => ({ correct: knows.has(item.id) }));
  assert.deepEqual(r.known.sort(), ["a", "b"]);
  assert.deepEqual(r.frontier, ["b"]);
  assert.ok(!r.known.includes("c"));
});

test("answers are idempotent per atom and the first question is the most informative", () => {
  const d = new Diagnostic(chain).start();
  const first = d.next()!;
  assert.equal(first.id, "c");
  d.answer("c", true);
  d.answer("c", false);
  assert.equal(d.asked.length, 1);
  assert.ok(d.p("a") > 0.75);
});
