import assert from "node:assert/strict";
import { test } from "node:test";
import { sceneOfChoices, SPY_BASE, SPY_SCENES, SPY_SPEED, SPY_STREAK_CAP, SPY_STREAK_STEP, spyPoints, spyRounds } from "@academy/ispy";
import type { LangItem } from "@academy/lang-systems";
import { buildPrompts } from "@academy/lobbies";
import { knownChoice } from "@academy/lobby-bots";
import { revealEntries } from "@academy/lobby-reveal";
import { award, boardPlayers, botTurns, myRank, roundLeft, settle, SPY_BOTS } from "./ispy-solo";

function word(id: string, forms: Record<string, string>): LangItem {
  return { id, kind: "word", baseId: id, tier: 0, unit: 0, category: "object", gloss: id, forms: { en: id, ...forms }, readings: {}, root: null, cognateLangs: [], example: {}, sentences: {}, gender: {} } as unknown as LangItem;
}

const ids = Array.from(new Set(SPY_SCENES.flatMap((s) => s.objects.map((o) => o.id))));
const ITEMS = ids.map((id) => word(id, { es: `${id}-es`, zh: `${id}-zh`, ru: id === "bread" ? "" : `${id}-ru` }));

test("every scene has unique objects inside the frame", () => {
  for (const s of SPY_SCENES) {
    assert.equal(new Set(s.objects.map((o) => o.id)).size, s.objects.length, s.id);
    for (const o of s.objects) assert.ok(o.x > 0 && o.x < 100 && o.y > 0 && o.y < 100, `${s.id}:${o.id}`);
    assert.equal(sceneOfChoices(s.objects.map((o) => o.id).reverse())?.id, s.id);
  }
});

test("rounds are deterministic, unique and answerable", () => {
  const a = spyRounds(ITEMS, { seed: "42", root: "en", targets: ["es", "zh"], rounds: 10 });
  const b = spyRounds(ITEMS, { seed: "42", root: "en", targets: ["es", "zh"], rounds: 10 });
  assert.deepEqual(a, b);
  assert.equal(a.length, 10);
  assert.equal(new Set(a.map((r) => r.answer)).size, 10);
  for (const r of a) {
    assert.ok(r.choices.includes(r.answer));
    assert.equal(r.gloss, `${r.answer}-${r.lang}`);
    assert.equal(sceneOfChoices(r.choices)?.id, r.scene);
  }
  assert.deepEqual(new Set(a.map((r) => r.lang)), new Set(["es", "zh"]));
});

test("rounds skip objects missing from the target language and the root", () => {
  const r = spyRounds(ITEMS, { seed: "7", root: "en", targets: ["ru"], rounds: 30, scene: "market" });
  assert.ok(r.length > 0);
  assert.ok(!r.some((x) => x.answer === "bread"));
  assert.deepEqual(spyRounds(ITEMS, { seed: "7", root: "en", targets: ["en"], rounds: 5 }), []);
  assert.equal(spyRounds(ITEMS, { seed: "7", root: "en", targets: ["es"], rounds: 3, scene: "harbor" })[0].scene, "harbor");
});

test("lobby prompts carry the spy mode", () => {
  const p = buildPrompts(ITEMS, { id: "L", seed: "99", root: "en", targets: ["es"], rounds: 5, game: "spy" });
  assert.equal(p.length, 5);
  assert.ok(p.every((x) => x.mode === "spy" && x.lobby_id === "L" && x.choices.includes(x.answer)));
});

test("scoring pays for speed and streaks", () => {
  assert.equal(spyPoints(false, 0, 12, 3), 0);
  assert.equal(spyPoints(true, 0, 12, 0), SPY_BASE + SPY_SPEED);
  assert.equal(spyPoints(true, 12000, 12, 0), SPY_BASE);
  assert.equal(spyPoints(true, 99999, 12, 0), SPY_BASE);
  assert.equal(spyPoints(true, 6000, 12, 2), SPY_BASE + SPY_SPEED / 2 + 2 * SPY_STREAK_STEP);
  assert.equal(spyPoints(true, 12000, 12, 50), SPY_BASE + SPY_STREAK_CAP * SPY_STREAK_STEP);
  const one = award({ score: 0, streak: 0 }, true, 0, 12);
  const two = award(one, true, 0, 12);
  assert.equal(two.points - one.points, SPY_STREAK_STEP);
  assert.deepEqual(award(two, false, 0, 12), { score: two.score, streak: 0, points: 0 });
});

test("bots know the object for a spied word", () => {
  const lookup = (lang: string, form: string) => ITEMS.filter((i) => i.forms[lang] === form);
  const [r] = spyRounds(ITEMS, { seed: "3", root: "en", targets: ["es"], rounds: 1 });
  assert.equal(knownChoice({ mode: "spy", lang: r.lang, gloss: r.gloss, choices: r.choices }, "en", lookup), r.answer);
});

test("solo bot turns land inside the round and repeat per seed", () => {
  const t = botTurns("s", 2, 12);
  assert.deepEqual(t, botTurns("s", 2, 12));
  assert.equal(t.length, SPY_BOTS.length);
  assert.ok(t.every((x) => x.atMs > 0 && x.atMs < 12000));
  const board = boardPlayers({ name: "You", score: 10, answered: true }, SPY_BOTS, { [SPY_BOTS[0].id]: { score: 5, streak: 1 } }, new Set([SPY_BOTS[0].id]));
  assert.equal(board[0].isMe, true);
  assert.equal(board[1].score, 5);
  assert.equal(board[1].answered, true);
});

test("reveal shows the word and its root meaning", () => {
  const item = ITEMS.find((i) => i.id === "fish")!;
  const e = revealEntries({ mode: "spy", lang: "zh", choices: ["fish"], answer: "fish" }, "en", item, () => []);
  assert.deepEqual(e.map((x) => [x.lang, x.word, x.correct]), [["zh", "fish-zh", true], ["en", "fish", false]]);
});

test("every scene object has an illustration", async () => {
  const { OBJECT_ART } = await import("@/ui/art/objects");
  const missing = ids.filter((id) => !OBJECT_ART[id]);
  assert.deepEqual(missing, []);
});

test("myRank places you by score among the bots", () => {
  const players = boardPlayers({ name: "You", score: 50, answered: false }, SPY_BOTS.slice(0, 2), { [SPY_BOTS[0].id]: { score: 90, streak: 0 } }, new Set());
  assert.equal(myRank(players), 2);
});

test("roundLeft falls from one to zero across the round", () => {
  assert.equal(roundLeft(1000, 1000, 10), 1);
  assert.equal(roundLeft(6000, 1000, 10), 0.5);
  assert.equal(roundLeft(99_000, 1000, 10), 0);
});

test("settle awards each bot turn on top of its tally", () => {
  const id = SPY_BOTS[0].id;
  const out = settle({}, [{ botId: id, correct: true, atMs: 1000 }], 10);
  assert.deepEqual(out[id], award({ score: 0, streak: 0 }, true, 1000, 10));
});
