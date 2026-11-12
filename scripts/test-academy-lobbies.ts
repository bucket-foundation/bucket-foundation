import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  answerDecision,
  assembleLobby,
  buildPrompts,
  seededRandom,
  seenDue,
  visiblePrompts,
  finished,
  generateLobbyCode,
  generateSeed,
  joinLobbyDecision,
  LOBBY_CAP,
  nextHost,
  normalizeLobbyCode,
  normalizeLobbyConfig,
  normalizeMessage,
  openLobbies,
  points,
  roundAt,
  startDecision,
  type LobbyPlayerRow,
  type LobbyRow,
} from "../src/lib/academy/lobbies";

const T0 = Date.parse("2026-11-12T10:00:00.000Z");

function lobby(over: Partial<LobbyRow> = {}): LobbyRow {
  return {
    id: "L1", code: "ABC123", host_id: "h", name: "Room", root: "en", targets: ["es"], seed: "42", status: "lobby", listed: true,
    rounds: 3, round_seconds: 10, started_at: null, version: 1, created_at: new Date(T0).toISOString(), ...over,
  };
}

function player(user_id: string, over: Partial<LobbyPlayerRow> = {}): LobbyPlayerRow {
  return { lobby_id: "L1", user_id, display_name: user_id.toUpperCase(), ready: false, score: 0, last_seen: new Date(T0).toISOString(), joined_at: new Date(T0).toISOString(), ...over };
}

test("lobby codes are six Crockford characters and normalize", () => {
  const code = generateLobbyCode(() => new Uint8Array([0, 1, 2, 3, 4, 31]));
  assert.equal(code, "01234Z");
  assert.equal(normalizeLobbyCode(" o1l-23z "), "01123Z");
  assert.equal(normalizeLobbyCode("ABCDE"), null);
  assert.equal(normalizeLobbyCode("ABCDEU"), null);
  assert.equal(normalizeLobbyCode(7), null);
});

test("seeds are decimal uint64 strings and never zero", () => {
  assert.equal(generateSeed(() => new Uint8Array(8)), "1");
  assert.equal(generateSeed(() => new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255])), "18446744073709551615");
});

test("config validates languages, rounds and timing", () => {
  assert.deepEqual(normalizeLobbyConfig({ root: "en", targets: ["es", "es", "en", "fr"] }), { name: "Polingual lobby", root: "en", targets: ["es", "fr"], rounds: 8, roundSeconds: 10, listed: true });
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["en"] }), null);
  assert.equal(normalizeLobbyConfig({ root: "EN!", targets: ["es"] }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], rounds: 50 }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], roundSeconds: 2 }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], listed: false })?.listed, false);
  assert.equal(normalizeLobbyConfig(null), null);
});

test("messages trim and cap at 200", () => {
  assert.equal(normalizeMessage("  hola   amigo "), "hola amigo");
  assert.equal(normalizeMessage(""), null);
  assert.equal(normalizeMessage("x".repeat(201)), null);
});

test("only the host starts, in lobby status, with two ready", () => {
  const ps = [player("h", { ready: true }), player("b")];
  assert.equal(startDecision(lobby(), ps, "b"), "not_host");
  assert.equal(startDecision(lobby(), ps, "h"), "need_ready");
  assert.equal(startDecision(lobby(), [ps[0], player("b", { ready: true })], "h"), "ok");
  assert.equal(startDecision(lobby({ status: "playing" }), ps, "h"), "not_lobby");
});

test("join respects cap and status", () => {
  assert.equal(joinLobbyDecision(lobby(), [player("h")], "h"), "already");
  assert.equal(joinLobbyDecision(lobby(), [player("h")], "x"), "ok");
  assert.equal(joinLobbyDecision(lobby({ status: "playing" }), [player("h")], "x"), "started");
  assert.equal(joinLobbyDecision(lobby(), Array.from({ length: LOBBY_CAP }, (_, i) => player(`p${i}`)), "x"), "full");
});

test("rounds come from started_at plus index times length", () => {
  const l = lobby({ status: "playing", started_at: new Date(T0).toISOString() });
  assert.equal(roundAt(l, T0 - 1000)?.index, -1);
  assert.deepEqual(roundAt(l, T0 + 15_000), { index: 1, startsAt: new Date(T0 + 10_000).toISOString(), endsAt: new Date(T0 + 20_000).toISOString() });
  assert.equal(roundAt(l, T0 + 30_000), null);
  assert.equal(finished(l, T0 + 29_999), false);
  assert.equal(finished(l, T0 + 30_000), true);
  assert.equal(roundAt(lobby(), T0), null);
});

test("points reward speed and give nothing for a miss", () => {
  assert.equal(points(true, 0, 10), 200);
  assert.equal(points(true, 5000, 10), 150);
  assert.equal(points(true, 20_000, 10), 100);
  assert.equal(points(false, 0, 10), 0);
});

test("the server scores the choice against its own answer key", () => {
  const l = lobby({ status: "playing", started_at: new Date(T0).toISOString() });
  const key = { round: 0, choices: ["gato", "perro", "casa", "mesa"], answer: "gato" };
  assert.deepEqual(answerDecision(l, key, 0, "gato", T0 + 2500), { ok: true, correct: true, ms: 2500, points: 175 });
  assert.deepEqual(answerDecision(l, key, 0, "perro", T0 + 2500), { ok: true, correct: false, ms: 2500, points: 0 });
  assert.deepEqual(answerDecision(l, key, 0, "forged", T0 + 2500), { ok: false, error: "bad_choice" });
  assert.deepEqual(answerDecision(l, null, 0, "gato", T0 + 2500), { ok: false, error: "bad_choice" });
  assert.deepEqual(answerDecision(l, key, 1, "gato", T0 + 2500), { ok: false, error: "wrong_round" });
  assert.deepEqual(answerDecision(l, key, 0, "gato", T0 - 10), { ok: false, error: "wrong_round" });
  assert.deepEqual(answerDecision(lobby(), key, 0, "gato", T0), { ok: false, error: "not_playing" });
});

function item(id: string, es: string, en: string, category = "food"): any {
  return { id, kind: "word", category, gloss: en, forms: { es, en } };
}

test("prompts are seeded, one word per round, answer among distinct choices", () => {
  const items = Array.from({ length: 30 }, (_, i) => item(`w${i}`, `es${i}`, `en${i}`, i % 2 ? "food" : "home"));
  items.push(item("same", "x", "x"));
  items.push({ ...item("phrase", "p", "q"), kind: "phrase" });
  const a = buildPrompts(items, lobby({ rounds: 6, seed: "7" }));
  const b = buildPrompts(items, lobby({ rounds: 6, seed: "7" }));
  const c = buildPrompts(items, lobby({ rounds: 6, seed: "8" }));
  assert.equal(a.length, 6);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(new Set(a.map((p) => p.item_id)).size, 6);
  for (const p of a) {
    assert.ok(p.choices.includes(p.answer));
    assert.equal(new Set(p.choices).size, p.choices.length);
    assert.equal(p.choices.length, 4);
    assert.ok(!["same", "phrase"].includes(p.item_id));
  }
  assert.deepEqual(buildPrompts([], lobby()), []);
  const r = seededRandom("42");
  const xs = Array.from({ length: 50 }, r);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

test("players see the current prompt without its answer and past answers after", () => {
  const rows = [0, 1, 2].map((round) => ({ lobby_id: "L1", round, lang: "es", item_id: `w${round}`, gloss: "g", choices: ["a", "b"], answer: "a" }));
  assert.deepEqual(visiblePrompts(rows, null, false), []);
  assert.deepEqual(visiblePrompts(rows, 1, false).map((p) => [p.round, p.answer]), [[0, "a"], [1, null]]);
  assert.equal(visiblePrompts(rows, null, true).length, 3);
  assert.equal(seenDue(new Date(T0).toISOString(), T0 + 9_999), false);
  assert.equal(seenDue(new Date(T0).toISOString(), T0 + 10_000), true);
});

test("next host is the earliest joiner who stays", () => {
  const ps = [player("h"), player("b", { joined_at: "2026-11-12T10:00:02Z" }), player("c", { joined_at: "2026-11-12T10:00:01Z" })];
  assert.equal(nextHost(ps, "h"), "c");
  assert.equal(nextHost([player("h")], "h"), null);
});

test("state hides blocked players, masks live answers and marks who answered", () => {
  const l = lobby({ status: "playing", started_at: new Date(T0).toISOString() });
  const ps = [player("h", { score: 150 }), player("b", { score: 300 }), player("x")];
  const msgs = [
    { id: 1, lobby_id: "L1", user_id: "b", body: "hi", created_at: "t" },
    { id: 2, lobby_id: "L1", user_id: "x", body: "spam", created_at: "t" },
  ];
  const answers = [
    { lobby_id: "L1", user_id: "b", round: 0, choice: "a", correct: true, ms: 1000, points: 190 },
    { lobby_id: "L1", user_id: "b", round: 1, choice: "a", correct: true, ms: 1000, points: 190 },
    { lobby_id: "L1", user_id: "h", round: 1, choice: "b", correct: false, ms: 900, points: 0 },
  ];
  const blocks = [{ id: "k", blocker_id: "h", target_user_id: "x", target_group_id: null, name: "", created_at: "" }];
  const s = assembleLobby(l, ps, msgs, answers, blocks, "h", T0 + 12_000);
  assert.deepEqual(s.players.map((p) => p.userId), ["b", "h"]);
  assert.equal(s.isHost, true);
  assert.deepEqual(s.messages.map((m) => [m.name, m.body]), [["B", "hi"]]);
  assert.equal(s.round?.index, 1);
  assert.deepEqual(s.players.map((p) => p.answered), [true, true]);
  assert.deepEqual(s.results.map((r) => `${r.userId}:${r.round}`), ["b:0", "h:1"]);
  assert.equal(s.players[0].online, true);
  assert.equal(assembleLobby(l, ps, [], [], [], "h", T0 + 60_000).players[0].online, false);
});

test("open list shows my lobbies first and hides closed, stale, full or blocked ones", () => {
  const rows = [
    lobby({ id: "A", host_id: "h" }),
    lobby({ id: "B", host_id: "x" }),
    lobby({ id: "C", host_id: "h", listed: false }),
    lobby({ id: "D", host_id: "h", created_at: new Date(T0 - 3_600_000).toISOString() }),
    lobby({ id: "E", host_id: "me", status: "playing" }),
    lobby({ id: "F", host_id: "h", status: "done" }),
  ];
  const ps = [player("h", { lobby_id: "A" }), player("x", { lobby_id: "B" }), player("h", { lobby_id: "C" }), player("h", { lobby_id: "D" }), player("me", { lobby_id: "E" }), player("me", { lobby_id: "F" })];
  const blocks = [{ id: "k", blocker_id: "me", target_user_id: "x", target_group_id: null, name: "", created_at: "" }];
  const out = openLobbies(rows, ps, blocks, "me", T0 + 1000);
  assert.deepEqual(out.map((l) => l.id), ["E", "A"]);
  assert.equal(out[0].isMember, true);
  assert.equal(out[1].host, "H");
});

test("migration keeps lobby tables private and limits joins in the database", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261112000000_polingual_lobbies.sql"), "utf8");
  for (const t of ["lobbies", "lobby_players", "lobby_messages", "lobby_answers"]) assert.match(sql, new RegExp(`alter table bucket\\.${t} enable row level security`));
  assert.match(sql, /revoke insert, update, delete on bucket\.lobbies/);
  assert.match(sql, /raise exception 'lobby_full'/);
  assert.match(sql, /primary key \(lobby_id, user_id, round\)/);
  assert.match(sql, /revoke all on bucket\.lobby_prompts, bucket\.lobby_limits from anon, authenticated/);
  assert.match(sql, /check \(answer = any \(choices\)\)/);
});

test("guest tokens sign a stable user id and refuse tampering or expiry", async () => {
  const g = await import("../src/lib/academy/lobby-guests");
  const secret = "s".repeat(40);
  const id = "device-abc-1234567890";
  const t = g.issueGuestToken(id, "Gia", secret, T0);
  assert.match(t.userId, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(t.userId, g.guestUserId(id));
  assert.equal(g.verifyGuestToken(t.token, secret, T0 + 1000)?.sub, t.userId);
  assert.equal(g.verifyGuestToken(t.token, "x".repeat(40), T0), null);
  assert.equal(g.verifyGuestToken(t.token.slice(0, -2) + "AA", secret, T0), null);
  assert.equal(g.verifyGuestToken(t.token, secret, T0 + g.GUEST_TTL_MS + 1), null);
  const [body, mac] = t.token.slice(3).split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), sub: "00000000-0000-0000-0000-000000000000" })).toString("base64url");
  assert.equal(g.verifyGuestToken(`g1.${forged}.${mac}`, secret, T0), null);
  assert.equal(g.normalizeGuestId("short"), null);
  assert.equal(g.normalizeGuestId("ok_guest-id-1234567"), "ok_guest-id-1234567");
  assert.equal(g.bearer("Bearer abc"), "abc");
  assert.equal(g.bearer(null), null);
});
