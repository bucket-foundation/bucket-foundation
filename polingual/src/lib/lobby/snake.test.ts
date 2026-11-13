import assert from "node:assert/strict";
import { test } from "node:test";
import { advance, collide, eat, GROW, makeSnake, MIN_LEN, SHRINK, START_LEN, steer, WORDS_ON_FIELD, type Arena } from "./snake";

const pool = { good: [{ form: "perro", lang: "es", meaning: "dog" }], decoys: [{ form: "chien", lang: "fr", meaning: "dog" }] };
const rand = () => 0.5;

test("snakes move, turn at a capped rate and keep their length", () => {
  const s = makeSnake("me", "You", false, 1, { x: 500, y: 500 }, 0, "#000");
  const moved = advance(s, Math.PI / 2, 0.1);
  assert.ok(moved.body[0].x > 500);
  assert.ok(moved.angle > 0 && moved.angle < Math.PI / 2);
  assert.equal(steer(0, Math.PI, 0.01) > 0 || steer(0, Math.PI, 0.01) < 0, true);
  let t = s;
  for (let i = 0; i < 50; i++) t = advance(t, 0, 0.05);
  assert.ok(t.body.length <= START_LEN);
});

test("good words grow, decoys shrink to a floor, and the field refills", () => {
  const me = makeSnake("me", "You", false, 1, { x: 100, y: 100 }, 0, "#000");
  const arena: Arena = { snakes: [me], words: [{ id: 1, x: 100, y: 100, form: "perro", lang: "es", meaning: "dog", good: true }], nextWord: 2, eaten: [], bad: [] };
  const a = eat(arena, pool, rand);
  assert.equal(a.snakes[0].length, START_LEN + GROW);
  assert.equal(a.eaten.length, 1);
  assert.equal(a.words.length, WORDS_ON_FIELD);
  const b = eat({ ...arena, words: [{ id: 1, x: 100, y: 100, form: "chien", lang: "fr", meaning: "dog", good: false }] }, pool, rand);
  assert.equal(b.snakes[0].length, Math.max(MIN_LEN, START_LEN - SHRINK));
  assert.equal(b.bad.length, 1);
});

test("the smaller of two touching snakes dies", () => {
  const big = { ...makeSnake("big", "Big", true, 1, { x: 300, y: 300 }, 0, "#000"), length: 20 };
  const small = makeSnake("me", "You", false, 1, { x: 291, y: 300 }, Math.PI, "#000");
  const out = collide({ snakes: [big, small], words: [], nextWord: 0, eaten: [], bad: [] });
  assert.deepEqual(out.died, ["me"]);
  const out2 = collide({ snakes: [{ ...big, length: 4 }, { ...small, length: 30 }], words: [], nextWord: 0, eaten: [], bad: [] });
  assert.deepEqual(out2.died, ["big"]);
});
