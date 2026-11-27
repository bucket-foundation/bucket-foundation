import { test } from "node:test";
import assert from "node:assert/strict";
import type { LobbyState } from "./client";
import { answerLang, learnedLangs, momentsFor } from "./moments";

type Player = LobbyState["players"][number];

function player(over: Partial<Player>): Player {
  return { userId: "u", name: "n", handle: null, ready: true, score: 0, isHost: false, isMe: false, online: true, answered: false, bot: false, skill: null, flag: null, firstRound: 0, continues: 0, ...over };
}

const prompt = (round: number, answer: string, mode = "mixed", lang: string | null = null) => ({ round, mode, lang, gloss: "x", choices: [answer], answer }) as LobbyState["prompts"][number];
const hit = (round: number, userId: string, correct: boolean, ms = 1000, points = correct ? 150 : 0) => ({ round, userId, correct, ms, points });
const name = (c: string) => ({ es: "Spanish", fr: "French" })[c] ?? c;

test("answerLang reads the language of each prompt mode", () => {
  assert.equal(answerLang({ mode: "mixed", lang: null, answer: "fr:chat" }), "fr");
  assert.equal(answerLang({ mode: "flag", lang: null, answer: "de" }), "de");
  assert.equal(answerLang({ mode: "form", lang: "es", answer: "agua" }), "es");
  assert.equal(answerLang({ mode: "form", lang: "es", answer: null }), null);
});

test("a perfect round needs every human right, bots aside", () => {
  const base = { playlist: ["daily"] as never[], game: "daily" as const, prompts: [prompt(0, "es:gato")] };
  const players = [player({ userId: "a", name: "Ana" }), player({ userId: "b", name: "Bo" }), player({ userId: "x", bot: true })];
  const all = momentsFor({ ...base, players, results: [hit(0, "a", true), hit(0, "b", true), hit(0, "x", false)] }, 0, new Map(), name);
  assert.ok(all.some((m) => m.kind === "perfect"));
  const one = momentsFor({ ...base, players, results: [hit(0, "a", true), hit(0, "b", false)] }, 0, new Map(), name);
  assert.ok(!one.some((m) => m.kind === "perfect"));
});

test("streaks call out at 3, 5 and 10", () => {
  const players = [player({ userId: "a", name: "Ana" }), player({ userId: "b", name: "Bo" })];
  const results = [0, 1, 2].map((r) => hit(r, "a", true));
  const lobby = { players, results, prompts: [0, 1, 2].map((r) => prompt(r, "es:x")), playlist: ["daily"] as never[], game: "daily" as const };
  assert.deepEqual(momentsFor(lobby, 2, new Map(), name).filter((m) => m.kind === "streak").map((m) => m.text), ["Ana: 3 in a row"]);
  assert.equal(momentsFor(lobby, 1, new Map(), name).filter((m) => m.kind === "streak").length, 0);
});

test("the first right answer in a new language is called once a player already knows another", () => {
  const players = [player({ userId: "a", name: "Ana" })];
  const lobby = { players, results: [hit(0, "a", true), hit(1, "a", true)], prompts: [prompt(0, "es:gato"), prompt(1, "fr:chat")], playlist: ["daily"] as never[], game: "daily" as const };
  const known0 = learnedLangs(lobby, -1);
  assert.equal(momentsFor(lobby, 0, known0, name).some((m) => m.kind === "new-language"), false);
  const known1 = learnedLangs(lobby, 0);
  assert.deepEqual(momentsFor(lobby, 1, known1, name).filter((m) => m.kind === "new-language").map((m) => m.text), ["Ana: first word in French!"]);
  assert.equal(momentsFor(lobby, 1, learnedLangs(lobby, 1), name).some((m) => m.kind === "new-language"), false);
});

test("a trailing player who answers right after the leader missed is called a steal in the final", () => {
  const playlist = ["daily", "tiles", "same-word"] as never[];
  const players = [player({ userId: "lead", name: "Lea", score: 900 }), player({ userId: "low", name: "Lo", score: 400 })];
  const results = [hit(0, "lead", false, 500), hit(0, "low", true, 900, 300)];
  const steals = momentsFor({ players, results, prompts: [prompt(0, "es:x")], playlist, game: "same-word" }, 0, new Map(), name).filter((m) => m.kind === "steal");
  assert.deepEqual(steals.map((m) => m.text), ["Lo steals!"]);
  const early = momentsFor({ players, results: [hit(0, "low", true, 100, 300), hit(0, "lead", false, 500)], prompts: [prompt(0, "es:x")], playlist, game: "same-word" }, 0, new Map(), name);
  assert.equal(early.some((m) => m.kind === "steal"), false);
});
