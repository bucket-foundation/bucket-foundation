import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assembleLobby,
  buildPrompts,
  isRace,
  LOBBY_GAMES,
  nativePlayable,
  normalizeLobbyConfig,
  RACE_GAMES,
  RACE_ROUND_SECONDS,
  RACE_ROUNDS,
  RACE_SCORE_MAX,
  raceDecision,
  raceGames,
  raceMs,
  raceOver,
  raceVisible,
  type LobbyRow,
} from "../src/lib/academy/lobbies";
import { gameTiming } from "../src/lib/academy/lobby-bots";

const T0 = Date.parse("2026-11-17T12:00:00Z");
const END = T0 + RACE_ROUNDS * RACE_ROUND_SECONDS * 1000;

function lobby(over: Partial<LobbyRow> = {}): LobbyRow {
  return { id: "l1", code: "ABCDEF", host_id: "u1", name: "Race", game: "polyword", root: "en", targets: ["es"], seed: "7", status: "playing", listed: true, rounds: RACE_ROUNDS, round_seconds: RACE_ROUND_SECONDS, started_at: new Date(T0).toISOString(), version: 1, created_at: new Date(T0 - 60_000).toISOString(), ...over };
}

function player(id: string, score = 0, bot = false) {
  return { lobby_id: "l1", user_id: id, display_name: id, ready: true, score, last_seen: new Date(T0).toISOString(), joined_at: new Date(T0 - 30_000).toISOString(), is_bot: bot };
}

function withRace<T>(value: string | undefined, work: () => T): T {
  const before = process.env.POLINGUAL_LOBBY_RACE;
  if (value === undefined) delete process.env.POLINGUAL_LOBBY_RACE;
  else process.env.POLINGUAL_LOBBY_RACE = value;
  try {
    return work();
  } finally {
    if (before === undefined) delete process.env.POLINGUAL_LOBBY_RACE;
    else process.env.POLINGUAL_LOBBY_RACE = before;
  }
}

test("race games are lobby games and build no prompts", () => {
  for (const g of RACE_GAMES) {
    assert.ok(isRace(g));
    assert.ok((LOBBY_GAMES as readonly string[]).includes(g));
    assert.deepEqual(buildPrompts([], { id: "l1", seed: "7", root: "en", targets: ["es"], rounds: RACE_ROUNDS, game: g }), []);
    assert.deepEqual(gameTiming(g), { rounds: RACE_ROUNDS, roundSeconds: RACE_ROUND_SECONDS });
  }
  assert.ok(!isRace("daily") && !isRace("tiles") && !isRace(undefined));
});

test("a race lobby is refused until the flag is on, then takes the race clock", () => {
  const body = { name: "Race", game: "snake", root: "en", targets: ["es"], rounds: 4, roundSeconds: 6 };
  assert.equal(withRace(undefined, () => normalizeLobbyConfig(body)), null);
  assert.deepEqual(withRace(undefined, () => raceGames()), []);
  const config = withRace("on", () => normalizeLobbyConfig(body));
  assert.equal(config?.game, "snake");
  assert.equal(config?.rounds, RACE_ROUNDS);
  assert.equal(config?.roundSeconds, RACE_ROUND_SECONDS);
  assert.equal(config?.playlist, null);
  assert.equal(config?.revealSeconds, 0);
  assert.equal(withRace("on", () => raceGames()).length, RACE_GAMES.length);
  assert.equal(withRace("on", () => normalizeLobbyConfig({ ...body, game: "chess" })), null);
});

test("a score counts once the race is running and is capped", () => {
  assert.deepEqual(raceDecision(lobby(), 420, T0 + 5000), { ok: true, score: 420, ms: 5000 });
  assert.deepEqual(raceDecision(lobby(), RACE_SCORE_MAX + 5, T0 + 1), { ok: true, score: RACE_SCORE_MAX, ms: 1 });
  assert.deepEqual(raceDecision(lobby(), 0, T0), { ok: true, score: 0, ms: 0 });
  for (const bad of [-1, 1.5, "9", null, undefined, Number.NaN]) assert.deepEqual(raceDecision(lobby(), bad, T0 + 5000), { ok: false, error: "bad_score" });
  assert.deepEqual(raceDecision(lobby(), 10, T0 - 1), { ok: false, error: "not_playing" });
  assert.deepEqual(raceDecision(lobby(), 10, END), { ok: false, error: "not_playing" });
  assert.deepEqual(raceDecision(lobby({ status: "lobby", started_at: null }), 10, T0), { ok: false, error: "not_playing" });
  assert.deepEqual(raceDecision(lobby({ status: "done" }), 10, T0 + 5000), { ok: false, error: "not_playing" });
  assert.deepEqual(raceDecision(lobby({ game: "daily" }), 10, T0 + 5000), { ok: false, error: "not_playing" });
});

test("the race ends when every person has a score", () => {
  const players = [player("u1"), player("u2"), player("b1", 0, true)];
  assert.equal(raceOver(players, [{ user_id: "u1" }]), false);
  assert.equal(raceOver(players, [{ user_id: "u1" }, { user_id: "u2" }]), true);
  assert.equal(raceOver([player("b1", 0, true)], []), false);
  assert.equal(raceOver([], []), false);
});

test("race lobbies show only to clients that play them", () => {
  assert.equal(nativePlayable({ game: "polyword" }), false);
  assert.equal(nativePlayable({ game: "polyword" }, true), true);
  assert.equal(nativePlayable({ game: "daily" }, true), true);
  assert.equal(nativePlayable({ game: "spy" }, true), false);
  assert.equal(raceVisible({ game: "polyword" }, false), false);
  assert.equal(raceVisible({ game: "polyword" }, true), true);
  assert.equal(raceVisible({ game: "spy" }, false), true);
});

test("race state shows every posted score and who has finished", () => {
  const answers = [{ lobby_id: "l1", user_id: "u2", round: 0, choice: "score", correct: true, ms: 40_000, points: 900 }];
  const state = assembleLobby(lobby(), [player("u1"), player("u2", 900)], [], answers, [], "u1", T0 + 200_000);
  assert.equal(state.game, "polyword");
  assert.deepEqual(state.prompts, []);
  assert.deepEqual(state.players.map((p) => [p.userId, p.score, p.answered]), [["u2", 900, true], ["u1", 0, false]]);
  assert.deepEqual(state.results, [{ round: 0, userId: "u2", correct: true, ms: 40_000, points: 900 }]);
});

test("equal race scores rank by the faster finish, then by name", () => {
  const answer = (user_id: string, ms: number) => ({ lobby_id: "l1", user_id, round: 0, choice: "score", correct: true, ms, points: 500 });
  const state = assembleLobby(lobby(), [player("ana", 500), player("bo", 500), player("cy", 500), player("di")], [], [answer("ana", 90_000), answer("bo", 40_000), answer("cy", 40_000)], [], "ana", T0 + 200_000);
  assert.deepEqual(state.players.map((p) => p.userId), ["bo", "cy", "ana", "di"]);
  assert.equal(raceMs([answer("bo", 40_000)], "bo"), 40_000);
  assert.equal(raceMs([], "bo"), Number.MAX_SAFE_INTEGER);
});

test("the migration lists every lobby game", () => {
  const sql = readFileSync(join(__dirname, "../supabase/migrations/20261117000000_polingual_lobby_race.sql"), "utf8");
  for (const g of LOBBY_GAMES) assert.ok(sql.includes(`'${g}'`), g);
});
