import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildLangCorpus } from "@academy/lang-systems";
import { buildPrompts, PROMPT_GAMES } from "@academy/lobbies";
import { LANG_CODES } from "@academy/lang-systems";
import { challengePoints, challengePrompts, judge } from "./challenge-play";
import { challengeGame } from "./share";

const dir = path.join(__dirname, "../../../../learning/app/corpus");
const read = (n: string) => JSON.parse(readFileSync(path.join(dir, n), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));

for (const game of PROMPT_GAMES) {
  test(`challenge replays the same ${game} set the room played`, () => {
    const c = { game: challengeGame(game), seed: "424242", root: "en", targets: ["es", "fr", "de"], rounds: 8, score: 0 };
    const room = buildPrompts(corpus.items, { id: "room", seed: c.seed, root: c.root, targets: c.targets, rounds: c.rounds, game, playlist: null }, LANG_CODES);
    const solo = challengePrompts(corpus.items, c);
    assert.ok(solo.length > 0);
    assert.deepEqual(solo.map((p) => [p.mode, p.gloss, p.answer, p.choices]), room.map((p) => [p.mode, p.gloss, p.answer, p.choices]));
    const p = solo[0];
    const right = p.mode === "tiles" ? p.answer.split(",").map(Number) : p.answer;
    assert.equal(judge(p, right), true);
    assert.ok(challengePoints(p, right, 0) > 0);
  });
}
