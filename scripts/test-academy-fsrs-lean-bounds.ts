import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DAY_MS, FSRS, FSRS_DEFAULT_W, type Card, type Rating } from "../src/lib/academy/fsrs";

const VECTORS = path.join(__dirname, "..", "lean", "vectors", "fsrs-bounds.txt");
const EXPECTED_VECTORS = 9999;
const DIFFICULTY_UNIT = 1024;
const STABILITY_UNIT = 6400;
const INTERVAL_UNIT = 4;
const GENERATED_CARDS = 10000;
const REVIEWS_PER_CARD = 4;
const NOW = 1_800_000_000_000;

type Vector = { kind: string; input: number; output: number };

const vectors: Vector[] = fs
  .readFileSync(VECTORS, "utf8")
  .split("\n")
  .slice(0, -1)
  .map((line) => {
    const [kind, input, output] = line.split(" ");
    return { kind, input: Number(input), output: Number(output) };
  });

function withWeight(index: number, value: number): FSRS {
  const w = [...FSRS_DEFAULT_W];
  w[index] = value;
  return new FSRS(w);
}

const clampD = (x: number) => withWeight(4, x).initDifficulty(1);
const clampS = (x: number) => withWeight(0, x).initStability(1);
const engine = new FSRS();

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inBounds(card: Card): boolean {
  const { difficulty: d, stability: s, scheduledDays: ivl, due } = card;
  return (
    typeof d === "number" && d >= 1 && d <= 10 &&
    typeof s === "number" && s >= 0.01 &&
    typeof ivl === "number" && Number.isInteger(ivl) && ivl >= 1 && ivl <= 3650 &&
    Number.isFinite(due)
  );
}

function storedCard(rand: () => number): Card {
  const stabilities = [0.01, 1, 1e300, Number.MAX_VALUE, 0.01 * 10 ** (rand() * 10)];
  const difficulties = [1, 10, 1 + rand() * 9];
  const days = [0, rand() * 30, rand() * 100000, -rand() * 30];
  return {
    stability: stabilities[Math.floor(rand() * stabilities.length)],
    difficulty: difficulties[Math.floor(rand() * difficulties.length)],
    lastReview: NOW - days[Math.floor(rand() * days.length)] * DAY_MS,
    reps: 1,
    lapses: 0,
    state: "review",
  } as Card;
}

test("the Lean vectors hold 3,333 cases for each clamp", () => {
  assert.equal(vectors.length, EXPECTED_VECTORS);
  for (const kind of ["D", "S", "I"]) assert.equal(vectors.filter((v) => v.kind === kind).length, EXPECTED_VECTORS / 3);
  assert.ok(vectors.every((v) => Number.isSafeInteger(v.input) && Number.isSafeInteger(v.output)));
});

test("the difficulty clamp matches Lean on every vector", () => {
  for (const v of vectors.filter((x) => x.kind === "D")) assert.equal(clampD(v.input / DIFFICULTY_UNIT), v.output / DIFFICULTY_UNIT, String(v.input));
});

test("the stability floor matches Lean on every vector", () => {
  for (const v of vectors.filter((x) => x.kind === "S")) assert.equal(clampS(v.input / STABILITY_UNIT), v.output / STABILITY_UNIT, String(v.input));
});

test("the interval matches Lean on every vector", () => {
  for (const v of vectors.filter((x) => x.kind === "I")) assert.equal(engine.interval(v.input / INTERVAL_UNIT), v.output, String(v.input));
});

test("the clamps hold at infinite inputs and pass NaN through", () => {
  assert.equal(clampD(Infinity), 10);
  assert.equal(clampD(-Infinity), 1);
  assert.equal(clampS(-Infinity), 0.01);
  assert.equal(clampS(Infinity), Infinity);
  assert.equal(engine.interval(Infinity), 3650);
  assert.equal(engine.interval(-Infinity), 1);
  assert.ok(Number.isNaN(clampD(NaN)));
  assert.ok(Number.isNaN(clampS(NaN)));
  assert.ok(Number.isNaN(engine.interval(NaN)));
});

test("10,000 generated cards stay in bounds through four reviews each", () => {
  const rand = mulberry(20261001);
  let reviews = 0;
  for (let i = 0; i < GENERATED_CARDS; i++) {
    let card: Card | null = rand() < 0.1 ? null : storedCard(rand);
    let now = NOW;
    for (let r = 0; r < REVIEWS_PER_CARD; r++) {
      const rating = (1 + Math.floor(rand() * 4)) as Rating;
      card = engine.review(card, rating, now);
      assert.ok(inBounds(card), JSON.stringify(card));
      now += Math.floor(rand() * 400) * DAY_MS;
      reviews++;
    }
  }
  assert.equal(reviews, GENERATED_CARDS * REVIEWS_PER_CARD);
});

test("a stored stability at or below zero, or a stored negative difficulty, escapes the bounds", () => {
  const stored = (stability: number, difficulty: number): Card => ({ stability, difficulty, lastReview: NOW - DAY_MS, state: "review" }) as Card;
  const zero = engine.review(stored(0, 5), 3, NOW);
  assert.ok(Number.isNaN(zero.stability) && Number.isNaN(zero.scheduledDays) && Number.isNaN(zero.due));
  const negative = engine.review(stored(-1, 5), 3, NOW);
  assert.ok(Number.isNaN(negative.stability) && Number.isNaN(negative.scheduledDays));
  const difficulty = engine.review(stored(1, -5), 1, NOW);
  assert.ok(Number.isNaN(difficulty.stability));
  assert.equal(difficulty.scheduledDays, 1);
  assert.ok(inBounds(engine.review(stored(0, 5), 1, NOW)));
});
