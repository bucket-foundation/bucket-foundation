import { test } from "node:test";
import assert from "node:assert/strict";
import { clockOffset, displayNickname, joinError, joinUrl, MARKS, normalizeCode, optionLabel, promptView, rank, secondsLeft } from "./client";
import { broadcastPayload, heartbeatFrame, joinFrame, socketUrl } from "./socket";

test("every answer carries a pigment, a glyph and a letter", () => {
  assert.deepEqual(MARKS.map((m) => `${m.pigment}-${m.glyph}-${m.letter}`), ["lapis-wave-A", "vermilion-spark-B", "malachite-leaf-C", "ochre-crescent-D"]);
});

test("nickname keys display as two capitalized words", () => {
  assert.equal(displayNickname("brave-otter"), "Brave Otter");
});

test("prompts read in plain English with the word set apart", () => {
  assert.deepEqual(promptView({ kind: "pick_word", prompt: { home: "water", home_lang: "en", lang: "es" } }), { lead: "Pick the word for", word: "water", tail: "in Spanish" });
  assert.deepEqual(promptView({ kind: "which_language", prompt: { word: "水" } }), { lead: "Which language is this?", word: "水", tail: null });
  assert.equal(optionLabel({ kind: "which_language", options: ["ja", "zh", "ko", "th"] }, 1), "Chinese");
  assert.equal(optionLabel({ kind: "pick_word", options: ["agua", "fuego", "tierra", "aire"] }, 0), "agua");
  assert.deepEqual(promptView({ kind: "translate", prompt: { word: "ocho", from: "es", to: "fr" } }), { lead: "Translate from Spanish", word: "ocho", tail: "into French" });
  assert.equal(optionLabel({ kind: "translate", options: ["huit", "sept", "neuf", "six"] }, 0), "huit");
});

test("codes normalize to the Crockford alphabet", () => {
  assert.equal(normalizeCode(" ab-c1o2 l"), "ABC102");
  assert.equal(normalizeCode("qz7k2mxx"), "QZ7K2M");
  assert.equal(joinUrl("https://polingual.com/", "QZ7K2M"), "https://polingual.com/join/QZ7K2M");
});

test("the clock offset and countdown use the server time", () => {
  assert.equal(clockOffset(1000, 1200, 5100), 4000);
  assert.equal(secondsLeft(30_000, 10_000, 5_000), 15);
  assert.equal(secondsLeft(30_000, 40_000, 0), 0);
  assert.equal(secondsLeft(null, 0, 0), 0);
  assert.equal(secondsLeft(20_000, -400, 0, 0), 20, "the countdown never shows more than the window");
});

test("join errors read as plain sentences", () => {
  assert.match(joinError("room_full"), /full/);
  assert.match(joinError("nope"), /Try again/);
});

test("rank finds the player in the standings", () => {
  const rows = [{ player_id: "a", nickname: "x-y", points: 9 }, { player_id: "b", nickname: "y-z", points: 3 }];
  assert.equal(rank(rows, "b"), 2);
  assert.equal(rank(rows, "c"), null);
});

test("the socket speaks the Realtime Phoenix protocol on the anon key", () => {
  assert.equal(socketUrl({ url: "http://127.0.0.1:54321/", key: "anon key", topic: "stoa:t" }), "ws://127.0.0.1:54321/realtime/v1/websocket?apikey=anon%20key&vsn=1.0.0");
  assert.equal(JSON.parse(joinFrame("stoa:t", "1")).topic, "realtime:stoa:t");
  assert.equal(JSON.parse(joinFrame("stoa:t", "1")).payload.config.private, false);
  assert.equal(JSON.parse(heartbeatFrame("2")).topic, "phoenix");
  assert.deepEqual(broadcastPayload(JSON.stringify({ event: "broadcast", payload: { event: "stoa", payload: { seq: 1 } } })), { seq: 1 });
  assert.equal(broadcastPayload(JSON.stringify({ event: "broadcast", payload: { event: "other", payload: {} } })), undefined);
  assert.equal(broadcastPayload("not json"), undefined);
});
