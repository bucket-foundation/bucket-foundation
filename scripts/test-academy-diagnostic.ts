import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Diagnostic, buildClosures, hardestQuiz, placementLevels, prerequisiteDepth } from "../src/lib/academy/diagnostic";
import { withLeverage, type Atom } from "../src/lib/academy/engine";

const q = (id: string) => [
  { level: "recall", prompt: `${id}?`, answer: id },
  { level: "derive", prompt: `derive ${id}`, answer: id },
];
const ids = "abcdefghijklmnopqr".split("");
const chain: Atom[] = withLeverage(ids.map((id, i) => ({ id, title: id.toUpperCase(), requires: i ? [ids[i - 1]] : [], quiz: q(id) })) as Atom[]);

const corpusDir = path.join(__dirname, "..", "learning", "app", "corpus");
const decks = ["01-mathematics", "02-physics", "03-chemistry"].map((d) => ({ id: d, atoms: withLeverage(JSON.parse(fs.readFileSync(path.join(corpusDir, `${d}.json`), "utf8")).atoms as Atom[]) }));

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("closures follow the chain both ways", () => {
  const c = buildClosures(chain);
  assert.deepEqual(Array.from(c.reqC.get("e")!).sort(), ["a", "b", "c", "d"]);
  assert.deepEqual(Array.from(c.unlC.get("o")!).sort(), ["p", "q", "r"]);
  assert.equal(prerequisiteDepth(chain).get("r"), 17);
});

test("levels run from shallow to deep prerequisites", () => {
  const levels = placementLevels(chain, 6);
  assert.equal(levels.length, 6);
  assert.deepEqual(levels[0].map((a) => a.id), ["a", "b", "c"]);
  assert.deepEqual(levels[5].map((a) => a.id), ["p", "q", "r"]);
});

test("each question is the hardest quiz the atom has", () => {
  const d = new Diagnostic(chain).start();
  assert.equal(d.next()!.level, "derive");
  for (const deck of decks) for (const a of deck.atoms) if ((a.quiz ?? []).some((x) => x.level === "derive")) assert.equal(hardestQuiz(a)!.level, "derive");
});

test("an expert passes every level with two of three right at each", () => {
  const r = new Diagnostic(chain).simulate(() => ({ correct: true }));
  assert.equal(r.levelsPassed, 6);
  assert.equal(r.questionsAsked, 12);
  assert.equal(r.known.length, 18);
});

test("one right answer at the top no longer skips the levels below", () => {
  const d = new Diagnostic(chain).start();
  d.answer("r", true);
  assert.equal(d.asked.length, 0);
  assert.equal(d.result().known.length, 0);
});

test("a beginner stops after two misses at the first level", () => {
  const r = new Diagnostic(chain).simulate(() => ({ correct: false }));
  assert.equal(r.questionsAsked, 2);
  assert.deepEqual(r.known, []);
});

test("placement stops at the first level that fails", () => {
  const knows = new Set(ids.slice(0, 9));
  const r = new Diagnostic(chain).simulate((item) => ({ correct: knows.has(item.id) }));
  assert.equal(r.levelsPassed, 3);
  assert.deepEqual(r.known, ids.slice(0, 9));
  assert.ok(!r.known.includes("j"));
});

test("slow right answers count half, so two slow ones do not pass a level", () => {
  const r = new Diagnostic(chain).simulate(() => ({ correct: true, slow: true }));
  assert.equal(r.levelsPassed, 0);
});

for (const deck of decks) {
  test(`${deck.id}: a learner who knows only the basics places low`, () => {
    const depth = prerequisiteDepth(deck.atoms);
    const r = new Diagnostic(deck.atoms).simulate((item) => ({ correct: (depth.get(item.id) ?? 0) === 0 }));
    assert.ok(r.levelsPassed <= 1, `${deck.id} passed ${r.levelsPassed} levels`);
    assert.ok(r.placedCount / r.total <= 0.2, `${deck.id} placed ${r.placedCount} of ${r.total}`);
  });

  test(`${deck.id}: a learner who guesses at random places at the bottom`, () => {
    const passed: number[] = [];
    let placed = 0;
    let total = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const roll = rng(seed);
      const r = new Diagnostic(deck.atoms).simulate(() => ({ correct: roll() < 0.5 }));
      passed.push(r.levelsPassed);
      placed += r.placedCount;
      total += r.total;
    }
    passed.sort((x, y) => x - y);
    assert.ok(passed[Math.floor(passed.length / 2)] <= 1, `median levels passed ${passed[200]}`);
    assert.ok(placed / total < 0.2, `mean placed share ${(placed / total).toFixed(3)}`);
    assert.ok(passed.filter((p) => p >= 3).length / passed.length < 0.15);
  });
}
