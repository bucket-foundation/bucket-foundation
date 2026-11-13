import assert from "node:assert/strict";
import { test } from "node:test";
import { adjacent, dealer, fresh, level, matches, resolve, rng, SIZE, swapped, type Board, type Meaning } from "./babel";

const meanings: Meaning[] = ["dog", "cat", "sun", "sea", "tree"].map((m) => ({ id: m, meaning: m, forms: { es: `${m}-es`, fr: `${m}-fr`, de: `${m}-de` } }));

test("a fresh board has no ready-made matches and is seeded", () => {
  const a = fresh(dealer(meanings, ["es", "fr", "de"], rng(7)));
  assert.equal(a.length, SIZE * SIZE);
  assert.equal(matches(a).size, 0);
  assert.deepEqual(fresh(dealer(meanings, ["es", "fr", "de"], rng(7))).map((c) => c.meaning), a.map((c) => c.meaning));
});

test("three of one meaning in a line clear even across languages, and the board refills", () => {
  const deal = dealer(meanings, ["es", "fr", "de"], rng(3), 1000);
  const board: Board = fresh(dealer(meanings, ["es", "fr", "de"], rng(9)));
  const rigged = board.slice();
  rigged[0] = { key: 1, meaning: "dog", lang: "es" };
  rigged[1] = { key: 2, meaning: "dog", lang: "fr" };
  rigged[2] = { key: 3, meaning: "dog", lang: "de" };
  assert.ok(matches(rigged).has(0) && matches(rigged).has(2));
  const out = resolve(rigged, deal);
  assert.ok(out.cleared.length >= 3);
  assert.equal(out.board.length, SIZE * SIZE);
  assert.equal(matches(out.board).size, 0);
  assert.ok(out.cleared.slice(0, 3).every((c) => c.meaning === "dog" || out.cascades > 0));
});

test("only neighbours swap", () => {
  assert.equal(adjacent(0, 1), true);
  assert.equal(adjacent(0, SIZE), true);
  assert.equal(adjacent(SIZE - 1, SIZE), false);
  assert.equal(adjacent(0, 2), false);
  const b = fresh(dealer(meanings, ["es"], rng(1)));
  assert.equal(swapped(b, 0, 1)[0], b[1]);
});

test("levels get harder", () => {
  assert.ok(level(5).goal > level(1).goal);
  assert.ok(level(10).moves <= level(1).moves);
});
