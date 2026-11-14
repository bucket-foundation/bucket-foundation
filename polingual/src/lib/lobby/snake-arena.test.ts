import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSnake, START_LEN, type Arena } from "./snake";
import { respawnMe, tick, uniqueWords } from "./snake-arena";

const pool = { good: [{ form: "perro", lang: "es", meaning: "dog" }], decoys: [{ form: "chien", lang: "fr", meaning: "dog" }] };
const rand = () => 0.5;

test("tick moves the snakes and plays a hit when a good word is eaten", () => {
  const me = makeSnake("me", "You", false, 1, { x: 100, y: 100 }, 0, "#000");
  const arena: Arena = { snakes: [me], words: [{ id: 1, x: 100, y: 100, form: "perro", lang: "es", meaning: "dog", good: true }], nextWord: 2, eaten: [], bad: [] };
  const out = tick(arena, pool, rand, null, 0.01);
  assert.equal(out.sound, "hit");
  assert.equal(out.arena.eaten.length, 1);
  assert.ok(out.arena.snakes[0].body[0].x > 100);
});

test("tick brings a dead bot back alive", () => {
  const bot = { ...makeSnake("b", "Bot", true, 0.8, { x: 900, y: 500 }, 0, "#111"), alive: false };
  const me = makeSnake("me", "You", false, 1, { x: 100, y: 100 }, 0, "#000");
  const out = tick({ snakes: [me, bot], words: [], nextWord: 0, eaten: [], bad: [] }, pool, rand, 0, 0.01);
  assert.equal(out.arena.snakes.find((s) => s.id === "b")?.alive, true);
});

test("respawnMe revives you at the centre and keeps your length", () => {
  const me = { ...makeSnake("me", "You", false, 1, { x: 100, y: 100 }, 0, "#000"), alive: false, length: START_LEN + 6 };
  const out = respawnMe({ snakes: [me], words: [], nextWord: 0, eaten: [], bad: [] });
  assert.equal(out.snakes[0].alive, true);
  assert.equal(out.snakes[0].length, START_LEN + 6);
});

test("uniqueWords drops repeats of the same form in the same language", () => {
  const w = { id: 1, x: 0, y: 0, form: "perro", lang: "es", meaning: "dog", good: true };
  assert.equal(uniqueWords([w, { ...w, id: 2 }, { ...w, lang: "it" }]).length, 2);
});
