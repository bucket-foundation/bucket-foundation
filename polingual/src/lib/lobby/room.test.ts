import { test } from "node:test";
import assert from "node:assert/strict";
import { choiceState, livesText, pickFor, roundFeedback, roundKeyOf, secondsUntil, tilesFeedback, timerWidth, everyoneReady, waitingHint, worldOf } from "./room";

test("worldOf maps lobby games onto worlds", () => {
  assert.equal(worldOf(null), "duel");
  assert.equal(worldOf({ game: "spy" }), "ispy");
  assert.equal(worldOf({ game: "live" }), "same-word");
});

test("roundKeyOf keys rounds and reveals by start and index", () => {
  assert.equal(roundKeyOf("s", { kind: "round", index: 2 }), "s:round:2");
  assert.equal(roundKeyOf("s", { kind: "finished" }), "finished");
  assert.equal(roundKeyOf("s", null), "");
});

test("picks and choice states follow the current game and round", () => {
  const mine = { game: "g", round: 1, choice: "a", correct: true, points: 3 };
  assert.equal(pickFor(mine, "g", 1), mine);
  assert.equal(pickFor(mine, "h", 1), null);
  assert.equal(choiceState(mine, true, "a"), "right");
  assert.equal(choiceState(mine, true, "b"), "dim");
  assert.equal(choiceState(null, false, "a"), undefined);
  assert.equal(roundFeedback(mine), "Right. +3");
  assert.equal(tilesFeedback({ ...mine, correct: false, points: 0 }), "Missed some. -1 life");
});

test("timers, lives and hints", () => {
  assert.equal(secondsUntil(null, 0), null);
  assert.equal(secondsUntil(new Date(2500).toISOString(), 0), 3);
  assert.equal(livesText(1), "♥♡♡");
  assert.equal(timerWidth(5, 10), "50%");
  const pl = (ready: boolean, bot = false) => ({ ready, bot }) as never;
  assert.equal(waitingHint({ standing: false, isHost: true, players: [pl(true), pl(false)] }), "Starts 15 seconds after everyone is ready.");
  assert.equal(waitingHint({ standing: false, isHost: true, players: [pl(true), pl(true)] }), "Everyone ready? Start now or wait for the countdown.");
});

test("everyoneReady needs every human ready and counts bots as ready", () => {
  const pl = (ready: boolean, bot = false) => ({ ready, bot }) as never;
  assert.equal(everyoneReady({ players: [pl(true)] }), false);
  assert.equal(everyoneReady({ players: [pl(true), pl(false)] }), false);
  assert.equal(everyoneReady({ players: [pl(true), pl(false, true)] }), true);
  assert.equal(everyoneReady({ players: [pl(false, true), pl(false, true)] }), false);
  assert.equal(everyoneReady({ players: [pl(true), pl(true), pl(true)] }), true);
});
