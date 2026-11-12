import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assembleLobby, buildPrompts, joinLobbyDecision, LOBBY_CAP, openLobbies, visiblePrompts, type LobbyPlayerRow, type LobbyRow } from "../src/lib/academy/lobbies";
import {
  botChoice,
  BOTS,
  botsEnabled,
  botUserId,
  chatLine,
  fillDue,
  FILL_WAIT_MS,
  knownChoice,
  pickBots,
  planAnswer,
  seatsToFill,
  SKILLS,
  standingBotTarget,
  standingStep,
  STANDING_LOBBY_MS,
  STANDING_RESULTS_MS,
  STANDING_SLOTS,
  type FormLookup,
} from "../src/lib/academy/lobby-bots";

const T0 = Date.parse("2026-11-12T10:00:00.000Z");

function lobby(over: Partial<LobbyRow> = {}): LobbyRow {
  return {
    id: "L1", code: "ABC123", host_id: "h", name: "Room", game: "daily", root: "en", targets: ["es"], seed: "42", status: "lobby", listed: true,
    rounds: 3, round_seconds: 10, started_at: null, version: 1, created_at: new Date(T0).toISOString(), ...over,
  };
}

function player(user_id: string, over: Partial<LobbyPlayerRow> = {}): LobbyPlayerRow {
  return { lobby_id: "L1", user_id, display_name: user_id.toUpperCase(), ready: false, score: 0, last_seen: new Date(T0).toISOString(), joined_at: new Date(T0).toISOString(), ...over };
}

function word(id: string, forms: Record<string, string>, category = "food"): any {
  return { id, kind: "word", category, gloss: forms.en, forms };
}

function lookupOf(items: { forms: Record<string, string> }[]): FormLookup {
  return (lang, form) => items.filter((i) => i.forms[lang] === form);
}

test("the flag is off unless POLINGUAL_LOBBY_BOTS is on", () => {
  assert.equal(botsEnabled({}), false);
  assert.equal(botsEnabled({ POLINGUAL_LOBBY_BOTS: "1" }), false);
  assert.equal(botsEnabled({ POLINGUAL_LOBBY_BOTS: "on" }), true);
});

test("bots carry stable ids, names, flags and all three skills", () => {
  assert.equal(new Set(BOTS.map((b) => b.userId)).size, BOTS.length);
  assert.match(botUserId(0), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(BOTS.every((b) => /^[A-Z]{2}$/.test(b.flag) && b.name.length >= 2));
  assert.deepEqual(new Set(BOTS.map((b) => b.skill)), new Set(["easy", "medium", "hard"]));
});

test("bot picks are deterministic per key and skip seated bots", () => {
  const a = pickBots("k", 3, new Set());
  assert.deepEqual(a, pickBots("k", 3, new Set()));
  const b = pickBots("k", 3, new Set([a[0].userId]));
  assert.ok(!b.some((x) => x.userId === a[0].userId));
  assert.equal(pickBots("k", 0, new Set()).length, 0);
});

test("fill never passes the cap or the target", () => {
  assert.equal(seatsToFill(1, 0, 4), 3);
  assert.equal(seatsToFill(2, 2, 4), 0);
  assert.equal(seatsToFill(7, 0, 12), 1);
  assert.equal(seatsToFill(5, 0, 4), 0);
  assert.equal(standingBotTarget(0), 5);
  assert.equal(standingBotTarget(3), 2);
  assert.equal(standingBotTarget(7), 1);
});

test("auto fill waits for the delay and only applies to bot_fill lobbies", () => {
  const l = lobby({ bot_fill: true });
  assert.equal(fillDue(l, T0 + FILL_WAIT_MS - 1), false);
  assert.equal(fillDue(l, T0 + FILL_WAIT_MS), true);
  assert.equal(fillDue(l, T0, true), true);
  assert.equal(fillDue(lobby(), T0 + FILL_WAIT_MS), false);
  assert.equal(fillDue(lobby({ bot_fill: true, status: "playing" }), T0 + FILL_WAIT_MS), false);
});

test("standing rooms wait, start, then reset after results", () => {
  assert.equal(standingStep(lobby(), T0 + STANDING_LOBBY_MS - 1), "wait");
  assert.equal(standingStep(lobby(), T0 + STANDING_LOBBY_MS), "start");
  const playing = lobby({ status: "playing", started_at: new Date(T0).toISOString() });
  assert.equal(standingStep(playing, T0 + 29_000), "wait");
  assert.equal(standingStep({ ...playing, status: "done" }, T0 + 30_000 + STANDING_RESULTS_MS - 1), "wait");
  assert.equal(standingStep({ ...playing, status: "done" }, T0 + 30_000 + STANDING_RESULTS_MS), "reset");
  assert.ok(STANDING_SLOTS.some((s) => s.game === "daily") && STANDING_SLOTS.some((s) => s.game === "live"));
});

test("answer timing and accuracy track skill over many rounds", () => {
  for (const skill of ["easy", "medium", "hard"] as const) {
    const plans = Array.from({ length: 2000 }, (_, i) => planAnswer(skill, `k${i}`, 10));
    const rate = plans.filter((p) => p.correct).length / plans.length;
    assert.ok(Math.abs(rate - SKILLS[skill].accuracy) < 0.05, `${skill} ${rate}`);
    assert.ok(plans.every((p) => p.atMs >= SKILLS[skill].from * 10_000 - 1 && p.atMs <= SKILLS[skill].to * 10_000 + 1));
  }
  const mean = (s: "easy" | "hard") => Array.from({ length: 500 }, (_, i) => planAnswer(s, `m${i}`, 10).atMs).reduce((a, b) => a + b) / 500;
  assert.ok(mean("hard") < mean("easy"));
});

test("bots read only the visible prompt, which carries no answer key during the round", () => {
  const items = Array.from({ length: 12 }, (_, i) => word(`w${i}`, { en: `en${i}`, es: `es${i}` }));
  const rows = buildPrompts(items, lobby({ rounds: 3, seed: "9" }));
  const visible = visiblePrompts(rows, 0, false).find((p) => p.round === 0)!;
  assert.equal(visible.answer, null);
  const known = knownChoice(visible, "en", lookupOf(items));
  assert.equal(known, rows[0].answer);
  const right = botChoice(visible, "en", lookupOf(items), { answers: true, correct: true, atMs: 0 }, "k");
  assert.equal(right, rows[0].answer);
  const wrong = botChoice(visible, "en", lookupOf(items), { answers: true, correct: false, atMs: 0 }, "k");
  assert.notEqual(wrong, rows[0].answer);
  assert.ok(visible.choices.includes(wrong));
});

test("flag prompts hide the language and bots resolve it from the word", () => {
  const items = Array.from({ length: 12 }, (_, i) => word(`w${i}`, { en: `en${i}`, es: `es${i}`, fr: `fr${i}`, de: `de${i}` }));
  const rows = buildPrompts(items, lobby({ game: "flags", targets: ["es"], rounds: 3, seed: "5" }), ["es", "fr", "de"]);
  const visible = visiblePrompts(rows, 0, false).find((p) => p.round === 0)!;
  assert.equal(visible.lang, null);
  assert.equal(knownChoice(visible, "en", lookupOf(items)), rows[0].answer);
});

test("an unknown word makes the bot guess among the choices", () => {
  const prompt = { mode: "form" as const, lang: "es", gloss: "zz", choices: ["a", "b", "c"] };
  assert.equal(knownChoice(prompt, "en", () => []), null);
  assert.ok(prompt.choices.includes(botChoice(prompt, "en", () => [], { answers: true, correct: true, atMs: 0 }, "x")));
});

test("chat comes from the fixed phrase lists at a bounded rate", () => {
  const lines = Array.from({ length: 1000 }, (_, i) => chatLine("greet", `g${i}`));
  const said = lines.filter((l) => l !== null);
  assert.ok(said.length > 250 && said.length < 450);
  assert.ok(said.every((l) => ["hi all", "hola", "good luck", "ready when you are", "salut", "ciao"].includes(l as string)));
});

test("bots are labelled in every player list", () => {
  const players = [player("h", { score: 10 }), player(BOTS[0].userId, { is_bot: true, skill: "hard", flag: "ES", display_name: "Lucía", score: 50 })];
  const state = assembleLobby(lobby({ standing_slot: "daily-romance" }), players, [], [], [], "h", T0);
  const bot = state.players.find((p) => p.userId === BOTS[0].userId)!;
  assert.deepEqual([bot.bot, bot.skill, bot.flag], [true, "hard", "ES"]);
  assert.equal(state.players.find((p) => p.userId === "h")!.bot, false);
  assert.equal(state.standing, true);
});

test("standing rooms list while playing and accept joins mid game, only with the flag on", () => {
  const standing = lobby({ id: "S", status: "playing", standing_slot: "live-romance", created_at: new Date(T0 - 3_600_000).toISOString() });
  const ps = [player("b", { lobby_id: "S", is_bot: true })];
  assert.equal(openLobbies([standing], ps, [], "u", T0, true).length, 1);
  assert.equal(openLobbies([standing], ps, [], "u", T0, true)[0].bots, 1);
  assert.equal(openLobbies([standing], ps, [], "u", T0, false).length, 0);
  assert.equal(joinLobbyDecision(standing, ps, "u"), "ok");
  assert.equal(joinLobbyDecision({ ...standing, standing_slot: null }, ps, "u"), "started");
  assert.equal(joinLobbyDecision(standing, Array.from({ length: LOBBY_CAP }, (_, i) => player(`p${i}`)), "u"), "full");
});

test("bot rows never reach account stats: no stats table reads lobby rows", () => {
  const root = join(__dirname, "..");
  const migration = readFileSync(join(root, "supabase/migrations/20261112100000_polingual_lobby_bots.sql"), "utf8");
  assert.match(migration, /is_bot boolean not null default false/);
  assert.match(migration, /order by is_bot, joined_at/);
  const server = readFileSync(join(root, "src/lib/academy/lobby-bots-server.ts"), "utf8");
  assert.doesNotMatch(server, /academy_progress|academy_profiles|streak/);
  assert.match(server, /submitAnswer\(/);
});
