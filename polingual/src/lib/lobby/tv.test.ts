import { test } from "node:test";
import assert from "node:assert/strict";
import type { LobbyState } from "./client";
import { TV_ORIGIN, tvAnswer, tvShortUrl, tvJoinUrl, tvKey, tvPlayers, tvRound, tvSfx, tvTrack } from "./tv";

type Player = LobbyState["players"][number];

function player(over: Partial<Player>): Player {
  return { userId: "u", name: "n", handle: null, ready: false, score: 0, isHost: false, isMe: false, online: true, answered: false, bot: false, skill: null, flag: null, firstRound: 0, continues: 0, ...over };
}

test("tvTrack maps phases onto Stoa music", () => {
  assert.equal(tvTrack({ kind: "waiting" }), "lobby");
  assert.equal(tvTrack({ kind: "countdown", seconds: 3 }), "lobby");
  assert.equal(tvTrack({ kind: "round", index: 0, remaining: 9 }), "question");
  assert.equal(tvTrack({ kind: "reveal", index: 0, remaining: 2 }), "reveal");
  assert.equal(tvTrack({ kind: "finished" }), "finale");
});

test("tvKey splits countdown seconds and the last round seconds", () => {
  assert.equal(tvKey("s", { kind: "countdown", seconds: 4.2 }), "s:countdown:5");
  assert.equal(tvKey("s", { kind: "round", index: 1, remaining: 8 }), "s:round:1");
  assert.equal(tvKey("s", { kind: "round", index: 1, remaining: 2.5 }), "s:round:1:t3");
  assert.equal(tvKey("s", { kind: "reveal", index: 1, remaining: 2 }), "s:reveal:1");
  assert.equal(tvKey("s", { kind: "waiting" }), "waiting");
});

test("tvSfx stays quiet on the first beat", () => {
  assert.deepEqual(tvSfx(null, { key: "s:round:0", players: 3 }), []);
});

test("tvSfx plays a join when the room grows", () => {
  assert.deepEqual(tvSfx({ key: "waiting", players: 1 }, { key: "waiting", players: 2 }), ["join"]);
  assert.deepEqual(tvSfx({ key: "waiting", players: 2 }, { key: "waiting", players: 1 }), []);
});

test("tvSfx cues each phase change", () => {
  assert.deepEqual(tvSfx({ key: "waiting", players: 2 }, { key: "s:countdown:5", players: 2 }), ["whoosh"]);
  assert.deepEqual(tvSfx({ key: "s:countdown:5", players: 2 }, { key: "s:countdown:4", players: 2 }), ["tick"]);
  assert.deepEqual(tvSfx({ key: "s:countdown:1", players: 2 }, { key: "s:round:0", players: 2 }), ["open"]);
  assert.deepEqual(tvSfx({ key: "s:round:0", players: 2 }, { key: "s:round:0:t3", players: 2 }), ["tick"]);
  assert.deepEqual(tvSfx({ key: "s:round:0:t1", players: 2 }, { key: "s:reveal:0", players: 2 }), ["reveal"]);
  assert.deepEqual(tvSfx({ key: "s:reveal:4", players: 2 }, { key: "finished", players: 2 }), ["fanfare"]);
  assert.deepEqual(tvSfx({ key: "s:round:0", players: 2 }, { key: "s:round:0", players: 2 }), []);
});

test("tvPlayers ranks players and leaves out the TV seat", () => {
  const rows = tvPlayers({ players: [player({ userId: "tv", name: "TV", isMe: true, score: 99 }), player({ userId: "a", name: "Ana", score: 2 }), player({ userId: "b", name: "Bo", score: 5 })] });
  assert.deepEqual(rows, [
    { player_id: "b", nickname: "Bo", points: 5 },
    { player_id: "a", nickname: "Ana", points: 2 },
  ]);
});

test("tvAnswer strips the language prefix from mixed prompts", () => {
  assert.equal(tvAnswer({ mode: "mixed", answer: "es:hola" } as never), "hola");
  assert.equal(tvAnswer({ mode: "word", answer: "chat" } as never), "chat");
  assert.equal(tvAnswer({ mode: "word", answer: null } as never), null);
});

test("tvRound describes the current round for the screen", () => {
  const lobby = { rounds: 5, players: [player({ isMe: true }), player({ userId: "a" })], prompts: [{ round: 1, mode: "word", lang: "fr", gloss: "cat", choices: ["chat", "chien"], answer: "chat" }] } as unknown as Pick<LobbyState, "rounds" | "prompts" | "players">;
  assert.equal(tvRound(lobby, { kind: "waiting" }).label, "1 player in");
  assert.equal(tvRound(lobby, { kind: "countdown", seconds: 2.1 }).seconds, 3);
  const round = tvRound(lobby, { kind: "round", index: 1, remaining: 7.5 });
  assert.deepEqual(round, { label: "Round 2 of 5", gloss: "cat", choices: ["chat", "chien"], answer: null, seconds: 8 });
  assert.equal(tvRound(lobby, { kind: "reveal", index: 1, remaining: 2 }).answer, "chat");
  assert.equal(tvRound(lobby, { kind: "round", index: 3, remaining: 4 }).gloss, null);
  assert.equal(tvRound(lobby, { kind: "finished" }).label, "Final scores");
});

test("tvJoinUrl points phones at the lobby room", () => {
  assert.equal(tvJoinUrl("https://polingual.com/", "ABC123"), "https://polingual.com/play/ABC123");
});

test("tvShortUrl drops the scheme for the screen", () => {
  assert.equal(tvShortUrl(tvJoinUrl(TV_ORIGIN, "ABC123")), "polingual.com/play/ABC123");
});
