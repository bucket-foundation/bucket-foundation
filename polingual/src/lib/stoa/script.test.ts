import { test } from "node:test";
import assert from "node:assert/strict";
import type { Snapshot } from "./client";
import { answerWord, boardLines, countdownSfx, finaleLines, hostCue, intensity, phoneCue, rankMoves, revealLines, trackFor } from "./script";
import { hz, SONGS } from "./stage";

function snap(over: Partial<Snapshot["room"]> = {}, rest: Partial<Snapshot> = {}): Snapshot {
  return {
    server_now: 0,
    room: { id: "r", code: "ABC123", phase: "lobby", idx: 0, seq: 1, token_version: 1, verify_key: "k", opens_at: null, closes_at: null, next_at: null, paused: false, locked: false, school_mode: false, expires_at: 0, total: 15, players: 0, ...over },
    standings: [],
    realtime: { url: "", key: "", topic: "" },
    ...rest,
  };
}

const q = { idx: 0, round: 1, kind: "pick_word" as const, prompt: { home: "water", lang: "es", home_lang: "en" }, options: ["agua", "fuego", "tierra", "aire"], answer: 0, counts: [3, 1, 0, 0] };

test("trackFor maps every phase to a track", () => {
  assert.equal(trackFor("lobby"), "lobby");
  assert.equal(trackFor("question"), "question");
  assert.equal(trackFor("closed"), "silent");
});

test("host lobby plays a join pop when a player arrives", () => {
  const a = snap({ players: 1 });
  const b = snap({ players: 2 });
  assert.deepEqual(hostCue(a, b).sfx, ["join"]);
  assert.deepEqual(hostCue(b, b).sfx, []);
});

test("host narrates the round opener and the question once", () => {
  const lobby = snap({ players: 3 });
  const open = snap({ phase: "question", players: 3 }, { question: { ...q, answer: null, counts: null } });
  const cue = hostCue(lobby, open);
  assert.deepEqual(cue.sfx, ["open"]);
  assert.equal(cue.track, "question");
  assert.equal(cue.say?.length, 2);
  assert.match(cue.say![1].text, /water.*Spanish/);
  assert.equal(hostCue(open, open).say?.length, 0);
});

test("host plays a lock click when the answered count rises", () => {
  const a = snap({ phase: "question", players: 3 }, { question: q, answered: 1 });
  const b = snap({ phase: "question", players: 3 }, { question: q, answered: 2 });
  assert.deepEqual(hostCue(a, b).sfx, ["lock"]);
});

test("reveal speaks the answer in its own language and grades the room", () => {
  const lines = revealLines(q, 4);
  assert.deepEqual(lines[0], { text: "agua", lang: "es", word: true });
  assert.ok(lines[1].text.length > 0);
  const which = { ...q, kind: "which_language" as const, prompt: { word: "Wasser" }, options: ["de", "nl", "sv", "en"] };
  assert.deepEqual(answerWord(which), { text: "Wasser", lang: "de", word: true });
  assert.match(revealLines(which, 4)[0].text, /German/);
});

test("board names a new leader", () => {
  const a = [{ player_id: "1", nickname: "brave-otter", points: 10 }, { player_id: "2", nickname: "calm-fox", points: 5 }];
  const b = [a[1], a[0]];
  assert.match(boardLines(a, b, 0)[0].text, /Calm Fox/);
  assert.match(boardLines(a, b, 0)[0].text, /lead|top/i);
});

test("finale counts down from third to the champion", () => {
  const rows = ["a-a", "b-b", "c-c"].map((n, i) => ({ player_id: String(i), nickname: n, points: 10 - i }));
  const lines = finaleLines(rows);
  assert.equal(lines.length, 3);
  assert.match(lines[2].text, /champion.*A A/);
});

test("phone cue picks right, wrong and streak sounds", () => {
  const open = snap({ phase: "question" }, { question: q, player: { id: "p", nickname: "x-y", removed: false, points: 0, streak: 0, choice: 0 } });
  const reveal = (choice: number | null, streak = 1) => snap({ phase: "reveal" }, { question: q, player: { id: "p", nickname: "x-y", removed: false, points: 0, streak, choice } });
  assert.deepEqual(phoneCue(open, reveal(0)).sfx, ["right"]);
  assert.deepEqual(phoneCue(open, reveal(0, 3)).sfx, ["streak"]);
  assert.deepEqual(phoneCue(open, reveal(2)).sfx, ["wrong"]);
  assert.deepEqual(phoneCue(open, reveal(null)).sfx, ["reveal"]);
});

test("countdown ticks once per second in the last five", () => {
  assert.equal(countdownSfx(6, 7), null);
  assert.equal(countdownSfx(5, 6), "tick");
  assert.equal(countdownSfx(5, 5), null);
  assert.equal(countdownSfx(2, 3), "tock");
  assert.equal(countdownSfx(0, 1), null);
});

test("rank moves report places gained", () => {
  const a = [{ player_id: "1", nickname: "a", points: 3 }, { player_id: "2", nickname: "b", points: 2 }, { player_id: "3", nickname: "c", points: 1 }];
  assert.deepEqual(rankMoves(a, [a[2], a[0], a[1]]), { "3": 2, "1": -1, "2": -1 });
  assert.deepEqual(rankMoves(null, a), {});
});

test("music layers grow with the room", () => {
  assert.equal(intensity(0), 0);
  assert.equal(intensity(3), 1);
  assert.equal(intensity(8), 2);
  assert.equal(intensity(30), 3);
});

test("songs stay in tune and in shape", () => {
  assert.equal(Math.round(hz(69)), 440);
  for (const song of Object.values(SONGS)) {
    assert.equal(song.arp.length, 16);
    assert.equal(song.chords.length, song.bass.length);
    if (song.melody) assert.equal(song.melody.length, 16);
  }
});
