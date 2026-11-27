import { test } from "node:test";
import assert from "node:assert/strict";
import { seededRandom } from "@academy/lobbies";
import { seatBand, timingBand, cardLevel, fairPoints, FAMILY_WINDOW_CAP_S, homeSpeakersOf, ladderLevel, promptSide, teacherAwards, timeFactor, windowSeconds, type FairCard } from "@academy/fair-score";

type Kind = "calibrated" | "sandbagger" | "guesser";
interface Sim { kind: Kind; level: number; band: FairCard["band"] }

const PLAYLIST_ROUNDS = 6;
const PROMPTS_PER_ROUND = 5;
const ROUNDS = PLAYLIST_ROUNDS * PROMPTS_PER_ROUND;
const ROUND_S = 15;

function pCorrect(skill: number, level: number): number {
  return 1 / (1 + Math.exp(-(1.2 * (skill - level) + 0.85)));
}

function night(players: Sim[], rand: () => number): number[] {
  return players.map((p) => {
    const start = p.kind === "sandbagger" ? Math.max(0, p.level - 1) : p.kind === "guesser" ? Math.floor(rand() * 4) : p.level;
    const answers: boolean[] = [];
    let total = 0;
    for (let r = 0; r < ROUNDS; r++) {
      const at = ladderLevel(start, answers);
      const right = p.kind === "guesser" ? rand() < 0.25 : rand() < pCorrect(p.level, at);
      const factor = timeFactor({ band: p.band });
      const win = windowSeconds(ROUND_S, factor);
      const pace = p.band === "under13" ? 1.8 : 1;
      const ms = Math.min(win * 1000, (0.2 + rand() * 0.5) * ROUND_S * 1000 * pace);
      answers.push(right);
      total += fairPoints(right, ms, win, r);
    }
    return total;
  });
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

test("1,000 simulated nights keep every level within 10% of the room and sandbagging under 5%", () => {
  const rand = seededRandom("20261127");
  const byLevel: number[][] = [[], [], [], []];
  const sand: number[] = [];
  const honest: number[] = [];
  const guess: number[] = [];
  for (let n = 0; n < 1000; n++) {
    const lv = () => Math.floor(rand() * 4);
    const players: Sim[] = [
      { kind: "calibrated", level: lv(), band: rand() < 0.3 ? "under13" : "adult" },
      { kind: "sandbagger", level: 1 + Math.floor(rand() * 3), band: "teen" },
      { kind: "guesser", level: lv(), band: "adult" },
      { kind: "calibrated", level: 0, band: "teen" },
    ];
    players[3].level = players[1].level;
    const scores = night(players, rand);
    byLevel[players[0].level].push(scores[0]);
    sand.push(scores[1]);
    honest.push(scores[3]);
    guess.push(scores[2]);
  }
  const room = mean(byLevel.flat());
  for (const [lv, xs] of byLevel.entries()) assert.ok(Math.abs(mean(xs) - room) / room <= 0.1, `level ${lv} mean ${mean(xs).toFixed(0)} vs room ${room.toFixed(0)}`);
  const gain = (mean(sand) - mean(honest)) / mean(honest);
  assert.ok(gain < 0.05, `sandbag gain ${(gain * 100).toFixed(1)}%`);
  assert.ok(mean(guess) < mean(honest), "guessing pays less than playing");
});

test("time factor gives kids up to 3x and caps the window at 45 seconds", () => {
  assert.equal(timeFactor({ band: "adult" }), 1);
  assert.equal(timeFactor({ band: "under13" }, 19_000, 20), 3);
  assert.equal(windowSeconds(20, 3), FAMILY_WINDOW_CAP_S);
  assert.equal(windowSeconds(10, 1), 10);
});

test("level ladder starts from the card and moves on right-answer rate", () => {
  const card: FairCard = { band: "adult", speaks: [{ lang: "es", level: 4 }], learn: ["fr"], check: { fr: "B1" } };
  assert.equal(cardLevel(card, "es"), 3);
  assert.equal(cardLevel(card, "fr"), 2);
  assert.equal(cardLevel(card, "de"), 0);
  assert.equal(ladderLevel(1, [true]), 2);
  assert.equal(ladderLevel(1, [false, true, true]), 2);
  assert.equal(ladderLevel(1, [false]), 0);
  assert.equal(ladderLevel(1, [false]), 0);
  assert.equal(ladderLevel(4, [true, true, true]), 5);
});

test("fair points pay the same base at every level", () => {
  assert.equal(fairPoints(true, 0, 10), 200);
  assert.equal(fairPoints(true, 30_000, 45), fairPoints(true, 6_667, 10));
  assert.equal(fairPoints(false, 0, 10), 0);
  assert.equal(fairPoints(true, 0, 10, 0), 100);
});

test("fluent speakers answer in their learn language, learners in what they know", () => {
  const abuela: FairCard = { band: "adult", speaks: [{ lang: "es", level: 4 }, { lang: "en", level: 1 }], learn: ["en"] };
  assert.deepEqual(promptSide(abuela, "es"), { side: "learn", answerLang: "en" });
  const kid: FairCard = { band: "under13", speaks: [{ lang: "en", level: 3 }], learn: ["es"] };
  assert.deepEqual(promptSide(kid, "es"), { side: "known", answerLang: "en" });
});

test("teacher award goes to a home speaker at most once per round", () => {
  const homes = homeSpeakersOf([{ userId: "abuela", card: { speaks: [{ lang: "es", level: 4 }] } }, { userId: "kid", card: { speaks: [{ lang: "en", level: 3 }] } }]);
  const langs = new Map([[0, "es"], [1, "es"], [2, "fr"]]);
  const answers = [
    { round: 0, userId: "kid", correct: true },
    { round: 0, userId: "abuela", correct: true },
    { round: 1, userId: "kid", correct: false },
    { round: 2, userId: "kid", correct: true },
  ];
  assert.deepEqual([...teacherAwards(langs, answers, homes)], [["abuela", 1]]);
});

test("a seat with no card plays on the default 1x window", () => {
  assert.equal(seatBand(null), "adult");
  assert.equal(timeFactor({ band: seatBand(null) }), 1);
});

test("a kid seat keeps the 2x window from its stored band alone", () => {
  assert.equal(timingBand(null, "under13"), "under13");
  assert.equal(timeFactor({ band: timingBand(null, "under13") }), 2);
  assert.equal(timingBand("teen", "under13"), "teen");
  assert.equal(timingBand(null, null), "adult");
});
