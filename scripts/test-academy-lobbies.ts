import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  joinedRound,
  nextGame,
  normalizeSetup,
  normalizeLobbySettings,
  breakMs,
  NIGHT_BREAK_MS,
  interludeAt,
  foreheadHolder,
  bonusQuestion,
  audienceDecision,
  bonusTallies,
  answerMultiplier,
  roomSignal,
  REACTIONS,
  nightRound,
  stealBonus,
  FAMILY_NIGHT,
  STEAL_POINTS,
  hostLeaveDecision,
  abandonedLobby,
  nextGameDue,
  NEXT_GAME_MS,
  setupEnabled,
  allReady,
  setupOf,
  answerDecision,
  hostedSince,
  OPEN_WINDOW_MS,
  assembleLobby,
  buildPrompts,
  seededRandom,
  seenDue,
  visiblePrompts,
  gameEndMs,
  nativePlayable,
  nativePlays,
  REVEAL_SECONDS,
  revealEnabled,
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
    id: "L1", code: "ABC123", host_id: "h", name: "Room", game: "daily", root: "en", targets: ["es"], seed: "42", status: "lobby", listed: true,
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
  assert.deepEqual(normalizeLobbyConfig({ root: "en", targets: ["es", "es", "en", "fr"] }), { name: "Polingual lobby", game: "daily", root: "en", targets: ["es", "fr"], rounds: 6, roundSeconds: 8, revealSeconds: 0, listed: true, playlist: null, mix: false });
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], reveal: true })?.revealSeconds, 0);
  process.env.POLINGUAL_LOBBY_REVEAL = "on";
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], reveal: true })?.revealSeconds, REVEAL_SECONDS);
  delete process.env.POLINGUAL_LOBBY_REVEAL;
  assert.equal(revealEnabled({ POLINGUAL_LOBBY_REVEAL: "on" }), true);
  assert.equal(revealEnabled({}), false);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["en"] }), null);
  assert.equal(normalizeLobbyConfig({ root: "EN!", targets: ["es"] }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], rounds: 50 }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], roundSeconds: 2 }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], listed: false })?.listed, false);
  assert.equal(normalizeLobbyConfig(null), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], game: "flags" })?.game, "flags");
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], game: "chess" }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], game: "same-word" }), null);
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es", "fr"], game: "same-word" })?.game, "same-word");
});

test("messages trim and cap at 200", () => {
  assert.equal(normalizeMessage("  hola   amigo "), "hola amigo");
  assert.equal(normalizeMessage(""), null);
  assert.equal(normalizeMessage("x".repeat(201)), null);
});

test("only the host starts, in lobby status, with two ready", () => {
  const ps = [player("h", { ready: true }), player("b")];
  assert.equal(startDecision(lobby(), ps, "b", T0), "not_host");
  assert.equal(startDecision(lobby(), ps, "h", T0), "need_ready");
  assert.equal(startDecision(lobby(), [ps[0], player("b", { ready: true })], "h", T0), "ok");
  assert.equal(startDecision(lobby({ status: "playing" }), ps, "h", T0), "not_lobby");
  assert.equal(startDecision(lobby(), [ps[0], player("b", { ready: true }), player("c", { ready: false })], "h", T0), "need_ready");
  assert.equal(startDecision(lobby(), [ps[0], player("b", { ready: false, is_bot: true })], "h", T0), "ok");
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

test("a reveal gap holds the next round and closes answers", () => {
  const l = lobby({ status: "playing", started_at: new Date(T0).toISOString(), reveal_seconds: 3 });
  assert.equal(gameEndMs({ ...l, started_at: l.started_at! }), T0 + 36_000);
  assert.deepEqual(roundAt(l, T0 + 9_999), { index: 0, startsAt: new Date(T0).toISOString(), endsAt: new Date(T0 + 10_000).toISOString() });
  assert.equal(roundAt(l, T0 + 11_000)?.reveal, true);
  assert.equal(roundAt(l, T0 + 11_000)?.index, 0);
  assert.deepEqual(roundAt(l, T0 + 13_000), { index: 1, startsAt: new Date(T0 + 13_000).toISOString(), endsAt: new Date(T0 + 23_000).toISOString() });
  assert.equal(roundAt(l, T0 + 35_999)?.index, 2);
  assert.equal(roundAt(l, T0 + 36_000), null);
  assert.equal(finished(l, T0 + 35_999), false);
  assert.equal(finished(l, T0 + 36_000), true);
  const key = { round: 0, choices: ["gato", "perro"], answer: "gato" };
  assert.deepEqual(answerDecision(l, key, 0, "gato", T0 + 11_000), { ok: false, error: "wrong_round" });
  const rows = [0, 1].map((round) => ({ lobby_id: "l1", round, lang: "es", item_id: `i${round}`, mode: "form" as const, gloss: "cat", choices: ["a", "b"], answer: "a" }));
  assert.deepEqual(visiblePrompts(rows, 0, false, undefined, true).map((p) => [p.round, p.answer]), [[0, "a"]]);
  assert.deepEqual(visiblePrompts(rows, 0, false).map((p) => [p.round, p.answer]), [[0, null]]);
});

test("native clients list only games they can play on the plain clock", () => {
  assert.equal(nativePlayable(lobby()), true);
  assert.equal(nativePlayable(lobby({ game: "tiles" })), false);
  assert.equal(nativePlayable(lobby({ reveal_seconds: 3 })), false);
  const plays = nativePlays("tiles, duel,reveal");
  assert.equal(nativePlayable(lobby({ game: "duel", reveal_seconds: 3 }), false, plays), true);
  assert.equal(nativePlayable(lobby({ game: "tiles" }), false, plays), true);
  assert.equal(nativePlayable(lobby({ game: "duel", reveal_seconds: 3 }), false, nativePlays("duel")), false);
  assert.equal(nativePlayable(lobby({ game: "spy" }), false, plays), false);
  assert.deepEqual(Array.from(nativePlays(null)), []);
});

test("a native header naming an unlisted game is refused", () => {
  const declared = nativePlays("spy, SPY, Tiles, made-up");
  assert.deepEqual(Array.from(declared).sort(), ["tiles"]);
  assert.equal(nativePlayable(lobby({ game: "spy" }), false, declared), false);
  assert.equal(nativePlayable(lobby({ game: "spy" }), false, nativePlays("spy")), false);
  assert.equal(nativePlayable(lobby({ game: "tiles" }), false, declared), true);
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

test("each game builds its own answer key and flags hide the language until the round ends", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `w${i}`, kind: "word", category: "food", gloss: `en${i}`, forms: { en: `en${i}`, es: `es${i}`, fr: `fr${i}` } })) as any[];
  const flags = buildPrompts(items, { ...lobby({ rounds: 5, targets: ["es", "fr"] }), game: "flags" }, ["de", "it", "en"]);
  assert.equal(flags.length, 5);
  for (const p of flags) {
    assert.equal(p.mode, "flag");
    assert.ok(p.choices.includes(p.answer) && p.answer === p.lang && !p.choices.includes("en"));
    assert.equal(p.gloss, items.find((i) => i.id === p.item_id).forms[p.lang]);
  }
  assert.deepEqual(flags.map((p) => p.round), [0, 1, 2, 3, 4]);
  const live = visiblePrompts(flags, 0, false)[0];
  assert.equal(live.lang, null);
  assert.equal(visiblePrompts(flags, 1, false)[0].lang, flags[0].lang);
  const same = buildPrompts(items, { ...lobby({ rounds: 4, targets: ["fr", "es"] }), game: "same-word" });
  assert.deepEqual(same.map((p) => p.lang), ["es", "fr", "es", "fr"]);
  assert.equal(same[0].item_id, same[1].item_id);
  assert.ok(same.every((p) => p.choices.includes(p.answer)));
  assert.deepEqual(buildPrompts(items, { ...lobby({ rounds: 4 }), game: "live" }), buildPrompts(items, lobby({ rounds: 4 })));
});

test("players see the current prompt without its answer and past answers after", () => {
  const rows = [0, 1, 2].map((round) => ({ lobby_id: "L1", round, lang: "es", item_id: `w${round}`, mode: "form" as const, gloss: "g", choices: ["a", "b"], answer: "a" }));
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
  assert.equal(out[1].hostHandle, null);
});

test("players and hosts carry their @username when they have one", () => {
  const ps = [player("h", { handle: "hana_k" }), player("b"), player("g", { handle: null })];
  const s = assembleLobby(lobby(), ps, [], [], [], "b", T0 + 1000);
  assert.deepEqual(Object.fromEntries(s.players.map((p) => [p.userId, p.handle])), { h: "hana_k", b: null, g: null });
  const out = openLobbies([lobby()], ps, [], "b", T0 + 1000);
  assert.equal(out[0].hostHandle, "hana_k");
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

test("a merged guest token stops working", async () => {
  const g = await import("../src/lib/academy/lobby-guests");
  const secret = "s".repeat(40);
  const t = g.issueGuestToken("merged_guest-id-123456", "Ana", secret, 1_000);
  const revoked = new Set<string>();
  assert.equal((await g.liveGuest(t.token, secret, 2_000, async (s) => revoked.has(s)))?.sub, t.userId);
  revoked.add(t.userId);
  assert.equal(await g.liveGuest(t.token, secret, 2_000, async (s) => revoked.has(s)), null);
  const merge = readFileSync(join(__dirname, "..", "src/app/api/academy/lobbies/guest/merge/route.ts"), "utf8");
  assert.ok(merge.indexOf("revokeGuest(claims.sub)") > merge.indexOf("merge_lobby_guest"));
  const sql = readFileSync(join(__dirname, "..", "supabase/migrations/20261124200000_polingual_lobby_guest_revoked.sql"), "utf8");
  assert.match(sql, /revoke all on bucket.lobby_guest_revoked from public, anon, authenticated/);
});

test("revoking a guest twice inserts once and needs no update grant", () => {
  const server = readFileSync(join(__dirname, "..", "src/lib/academy/lobbies-server.ts"), "utf8");
  assert.match(server, /from\(GUEST_REVOKED\)\.upsert\(\{ guest_id: sub \}, \{ onConflict: "guest_id", ignoreDuplicates: true \}\)/);
  const grant = readFileSync(join(__dirname, "..", "supabase/migrations/20261124220000_polingual_lobby_guest_revoked_update.sql"), "utf8");
  assert.match(grant, /grant select, insert, update, delete on bucket\.lobby_guest_revoked to service_role;/);
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

test("the host limit looks back over the open window only", () => {
  assert.equal(hostedSince(Date.parse("2026-11-12T12:00:00Z")), new Date(Date.parse("2026-11-12T12:00:00Z") - OPEN_WINDOW_MS).toISOString());
});

function multi(id: string, n: number): any {
  return { id, kind: "word", category: n % 2 ? "food" : "home", gloss: `en${n}`, forms: { en: `en${n}`, es: `es${n}`, fr: `fr${n}`, de: `de${n}` } };
}

test("mixed prompts span the lobby languages with one right answer", () => {
  const items = Array.from({ length: 40 }, (_, i) => multi(`m${i}`, i));
  const rows = buildPrompts(items, { ...lobby({ rounds: 6, seed: "11" }), targets: ["es", "fr", "de"], playlist: ["daily"] });
  assert.equal(rows.length, 6);
  for (const r of rows) {
    assert.equal(r.mode, "mixed");
    assert.ok(r.choices.includes(r.answer));
    assert.ok(r.answer.startsWith(`${r.lang}:`));
    const langs = new Set(r.choices.map((c) => c.slice(0, c.indexOf(":"))));
    assert.ok(langs.size >= 2);
    const right = r.choices.filter((c) => items.some((i: any) => i.forms[c.slice(0, c.indexOf(":"))] === c.slice(c.indexOf(":") + 1) && i.forms.en === r.gloss));
    assert.deepEqual(right, [r.answer]);
  }
  const legacy = buildPrompts(items, { ...lobby({ rounds: 6, seed: "11" }), targets: ["es", "fr", "de"] });
  assert.ok(legacy.every((r) => r.mode === "form"));
});

test("lobby setup: single, sequence and random mix", () => {
  const env = process.env.POLINGUAL_LOBBY_SETUP;
  process.env.POLINGUAL_LOBBY_SETUP = "on";
  try {
    assert.deepEqual(normalizeSetup({}, "flags", ["es"]), { game: "flags", playlist: ["flags"], mix: false });
    assert.deepEqual(normalizeSetup({ setup: "sequence", games: ["flags", "tiles"] }, "daily", ["es"]), { game: "flags", playlist: ["flags", "tiles"], mix: false });
    assert.equal(normalizeSetup({ setup: "sequence", games: ["flags"] }, "daily", ["es"]), null);
    assert.equal(normalizeSetup({ setup: "sequence", games: ["flags", "nope"] }, "daily", ["es"]), null);
    assert.equal(normalizeSetup({ setup: "sequence", games: ["flags", "same-word"] }, "daily", ["es"]), null);
    const mix = normalizeSetup({ setup: "mix" }, "daily", ["es"]);
    assert.ok(mix?.mix && !mix.playlist?.includes("same-word"));
    assert.equal(setupOf({ playlist: ["flags", "tiles"], mix: false }), "sequence");
    assert.equal(setupOf({ playlist: ["flags"], mix: false }), "single");
    assert.equal(nextGame({ game: "flags", playlist: ["flags", "tiles", "daily"], mix: false, seed: "1", targets: ["es"] }), "tiles");
    assert.equal(nextGame({ game: "daily", playlist: ["flags", "tiles", "daily"], mix: false, seed: "1", targets: ["es"] }), "flags");
    const picks = new Set(["1", "2", "3", "4", "5", "6", "7", "8"].map((seed) => nextGame({ game: "daily", playlist: ["daily", "flags", "tiles", "live"], mix: true, seed, targets: ["es", "fr"] })));
    assert.ok(!picks.has("daily") && picks.size >= 2);
  } finally {
    process.env.POLINGUAL_LOBBY_SETUP = env;
  }
});

test("joined round: before the start counts from round zero, mid game from the next open round", () => {
  const l = { started_at: new Date(T0).toISOString(), rounds: 6, round_seconds: 8, reveal_seconds: 4 };
  assert.equal(joinedRound(l, new Date(T0 - 5000).toISOString()), 0);
  assert.equal(joinedRound(l, new Date(T0 + 1000).toISOString()), 0);
  assert.equal(joinedRound(l, new Date(T0 + 9000).toISOString()), 1);
  assert.equal(joinedRound(l, new Date(T0 + 13000).toISOString()), 1);
});

test("lobby settings: host patch validates games and languages before start", () => {
  const env = process.env.POLINGUAL_LOBBY_SETUP;
  process.env.POLINGUAL_LOBBY_SETUP = "on";
  const lobby = { game: "flags" as const, root: "en", targets: ["es"], status: "lobby" as const };
  try {
    assert.deepEqual(normalizeLobbySettings({ setup: "single", game: "tiles" }, lobby), { game: "tiles", targets: ["es"], playlist: ["tiles"], mix: false });
    assert.deepEqual(normalizeLobbySettings({ setup: "sequence", games: ["daily", "flags"] }, lobby), { game: "daily", targets: ["es"], playlist: ["daily", "flags"], mix: false });
    assert.equal(normalizeLobbySettings({ setup: "mix" }, lobby)?.mix, true);
    assert.deepEqual(normalizeLobbySettings({ targets: ["fr", "en", "fr"] }, lobby)?.targets, ["fr"]);
    assert.equal(normalizeLobbySettings({ targets: ["en"] }, lobby), null);
    assert.equal(normalizeLobbySettings({ targets: [] }, lobby), null);
    assert.equal(normalizeLobbySettings({ targets: ["<x>"] }, lobby), null);
    assert.equal(normalizeLobbySettings({ game: "nope" }, lobby), null);
    assert.equal(normalizeLobbySettings({ setup: "single", game: "same-word" }, lobby), null);
    assert.equal(normalizeLobbySettings({ setup: "single", game: "same-word", targets: ["es", "fr"] }, lobby)?.game, "same-word");
    assert.equal(normalizeLobbySettings({ game: "tiles" }, { ...lobby, status: "playing" }), null);
    assert.equal(normalizeLobbySettings(null, lobby), null);
    process.env.POLINGUAL_LOBBY_SETUP = "off";
    assert.deepEqual(normalizeLobbySettings({ game: "tiles" }, lobby), { game: "tiles", targets: ["es"] });
    assert.equal(normalizeLobbySettings({ setup: "mix", targets: ["es", "fr", "it", "pt"] }, lobby), null);
    assert.equal(normalizeLobbySettings({ setup: "sequence", games: ["tiles", "daily"] }, lobby), null);
    assert.equal(normalizeLobbySettings({ setup: "nope" }, lobby), null);
  } finally {
    process.env.POLINGUAL_LOBBY_SETUP = env;
  }
});

test("lobby settings: every mode the room sends saves, with setup on and off", () => {
  const env = process.env.POLINGUAL_LOBBY_SETUP;
  const romance = ["es", "fr", "it", "pt"];
  const bodies = [
    { setup: "single", game: "tiles", targets: romance },
    { setup: "single", game: "same-word", targets: romance },
    { setup: "sequence", games: ["flags", "daily", "same-word"], targets: romance },
    { setup: "mix", targets: romance },
    { setup: "mix", targets: ["es"] },
  ];
  const lobbies = [
    { game: "flags" as const, root: "en", targets: ["es"], status: "lobby" as const },
    { game: "duel" as const, root: "en", targets: romance, status: "lobby" as const },
    { game: null, root: "en", targets: romance, status: "lobby" as const },
  ];
  try {
    for (const flag of ["on", "on\n", " ON "]) {
      process.env.POLINGUAL_LOBBY_SETUP = flag;
      for (const lobby of lobbies) for (const body of bodies) assert.ok(normalizeLobbySettings(body, lobby as never), `${flag} ${lobby.game} ${JSON.stringify(body)}`);
    }
  } finally {
    process.env.POLINGUAL_LOBBY_SETUP = env;
  }
});

test("allReady: every human ready, bots count as ready, two seats minimum", () => {
  assert.equal(allReady([{ ready: true }]), false);
  assert.equal(allReady([{ ready: true }, { ready: false }]), false);
  assert.equal(allReady([{ ready: true }, { ready: true }]), true);
  assert.equal(allReady([{ ready: true }, { ready: false, is_bot: true }]), true);
  assert.equal(allReady([{ ready: false, is_bot: true }, { ready: false, is_bot: true }]), false);
  assert.equal(allReady([{ ready: true }, { ready: true }, { ready: false }]), false);
  const now = T0 + 600_000;
  const fresh = new Date(now - 5_000).toISOString();
  const stale = new Date(now - 120_000).toISOString();
  assert.equal(allReady([{ ready: true, last_seen: fresh }, { ready: true, last_seen: fresh }, { ready: false, last_seen: stale }], now), true);
  assert.equal(allReady([{ ready: true, last_seen: fresh }, { ready: false, last_seen: fresh }], now), false);
  assert.equal(allReady([{ ready: true, last_seen: fresh }, { ready: false, last_seen: stale }], now), false);
  assert.equal(startDecision({ host_id: "h", status: "lobby" }, [{ ready: true, last_seen: fresh }, { ready: true, last_seen: fresh }, { ready: false, last_seen: stale }], "h", now), "ok");
});

test("lobby flags read on with stray whitespace or case from the host env", () => {
  assert.equal(setupEnabled({ POLINGUAL_LOBBY_SETUP: "on\n" }), true);
  assert.equal(setupEnabled({ POLINGUAL_LOBBY_SETUP: " On " }), true);
  assert.equal(setupEnabled({ POLINGUAL_LOBBY_SETUP: "off" }), false);
  assert.equal(setupEnabled({}), false);
  assert.equal(revealEnabled({ POLINGUAL_LOBBY_REVEAL: "on\r\n" }), true);
});

test("lobby settings: mix and game set persist as mix and sequence", () => {
  const env = process.env.POLINGUAL_LOBBY_SETUP;
  process.env.POLINGUAL_LOBBY_SETUP = "on\n";
  const lobby = { game: "flags" as const, root: "en", targets: ["es"], status: "lobby" as const };
  try {
    const mix = normalizeLobbySettings({ setup: "mix", targets: ["es", "fr", "it", "pt"] }, lobby);
    assert.equal(setupOf({ playlist: mix!.playlist!, mix: mix!.mix! }), "mix");
    const set = normalizeLobbySettings({ setup: "sequence", games: ["tiles", "daily"] }, lobby);
    assert.equal(setupOf({ playlist: set!.playlist!, mix: set!.mix! }), "sequence");
    const one = normalizeLobbySettings({ setup: "single", game: "tiles" }, lobby);
    assert.equal(setupOf({ playlist: one!.playlist!, mix: one!.mix! }), "single");
  } finally {
    process.env.POLINGUAL_LOBBY_SETUP = env;
  }
});

test("next game is due 60 seconds after the game ends, or at once when the host skips", () => {
  const done = { status: "done" as const, started_at: new Date(T0).toISOString(), rounds: 2, round_seconds: 10, reveal_seconds: 0 };
  const end = T0 + 20_000;
  assert.equal(nextGameDue(done, end + 59_000), false);
  assert.equal(nextGameDue(done, end + 60_000), true);
  assert.equal(nextGameDue(done, end, true), true);
  assert.equal(nextGameDue({ ...done, status: "playing" }, end + 60_000, true), false);
  assert.equal(NEXT_GAME_MS, 60_000);
});

test("host-only lobby routes reject everyone but the host", () => {
  for (const name of ["bots", "start", "settings", "next", "end", "hostmode"]) {
    const src = readFileSync(join(__dirname, "../src/app/api/academy/lobbies", name, "route.ts"), "utf8");
    assert.ok(/host_id !== a\.uid\) return json\(\{ error: "not_host" \}, 403\)|decision === "not_host"\) return json\(\{ error: "not_host" \}, 403\)/.test(src), `${name} must reject non-hosts`);
  }
});

test("a lobby with no human seen recently is abandoned and drops off the open list", () => {
  const now = T0 + 600_000;
  const fresh = new Date(now - 5_000).toISOString();
  const stale = new Date(now - 120_000).toISOString();
  const base = { id: "L1", status: "lobby" as const, standing_slot: null };
  assert.equal(abandonedLobby(base, [{ lobby_id: "L1", last_seen: fresh, is_bot: false }], now), false);
  assert.equal(abandonedLobby(base, [{ lobby_id: "L1", last_seen: stale, is_bot: false }, { lobby_id: "L1", last_seen: fresh, is_bot: true }], now), true);
  assert.equal(abandonedLobby(base, [], now), true);
  assert.equal(abandonedLobby({ ...base, status: "playing" }, [{ lobby_id: "L1", last_seen: stale }], now), false);
  assert.equal(abandonedLobby({ ...base, status: "playing" }, [{ lobby_id: "L1", last_seen: new Date(now - 6 * 60_000).toISOString() }], now), true);
  assert.equal(abandonedLobby({ ...base, status: "done" }, [], now), false);
  assert.equal(abandonedLobby({ ...base, standing_slot: "daily-romance" }, [], now), false);
  const row = (id: string, over: Partial<LobbyRow> = {}) => ({ ...lobby({ id, created_at: new Date(now - 60_000).toISOString() }), ...over }) as LobbyRow;
  const seat = (lobby_id: string, user_id: string, seen: string) => ({ ...player(user_id, { last_seen: seen }), lobby_id });
  const rows = [row("A", { host_id: "me" }), row("B", { host_id: "x" }), row("C", { host_id: "y" }), row("D", { host_id: "z", status: "playing" }), row("E", { host_id: "me", ended_at: new Date(now).toISOString(), status: "done" })];
  const seats = [seat("A", "me", stale), seat("B", "x", fresh), seat("C", "y", stale), seat("D", "z", fresh), seat("E", "me", fresh)];
  assert.deepEqual(openLobbies(rows, seats, [], "me", now).map((l) => l.id), ["B"]);
});

test("a leaving host hands the room to the earliest present human, or closes it", () => {
  const now = T0 + 600_000;
  const fresh = new Date(now - 5_000).toISOString();
  const stale = new Date(now - 120_000).toISOString();
  const seat = (user_id: string, joined: number, seen: string, is_bot = false) => ({ user_id, joined_at: new Date(T0 + joined).toISOString(), last_seen: seen, is_bot });
  assert.deepEqual(hostLeaveDecision("h", [seat("h", 0, fresh), seat("b", 2000, fresh), seat("a", 1000, fresh)], now), { kind: "handoff", to: "a" });
  assert.deepEqual(hostLeaveDecision("h", [seat("h", 0, fresh), seat("a", 1000, stale), seat("bot", 500, fresh, true)], now), { kind: "close" });
  assert.deepEqual(hostLeaveDecision("h", [], now), { kind: "close" });
});

test("a host-screen lobby with no players yet stays listed while its screen is watched", () => {
  const now = T0 + 600_000;
  const row = { ...lobby({ id: "S", host_id: "h", created_at: new Date(now - 30_000).toISOString() }) } as LobbyRow;
  assert.deepEqual(openLobbies([row], [], [], "x", now).map((l) => l.id), []);
  assert.deepEqual(openLobbies([row], [], [], "x", now, false, new Set(["S"])).map((l) => l.id), ["S"]);
});

test("family night runs Warm Up, Picture Race and a final, and only the final doubles", () => {
  const playlist = FAMILY_NIGHT.map((r) => r.game);
  assert.deepEqual(FAMILY_NIGHT.map((r) => r.label), ["Warm Up", "Picture Race", "Final"]);
  assert.deepEqual(nightRound({ playlist, mix: false, game: "daily" }), { index: 0, label: "Warm Up", final: false, total: 3 });
  assert.equal(nightRound({ playlist, mix: false, game: "same-word" })?.final, true);
  assert.equal(nightRound({ playlist, mix: true, game: "same-word" }), null);
  assert.equal(nightRound({ playlist: ["daily", "flags"], mix: false, game: "flags" }), null);
  assert.equal(breakMs({ playlist, mix: false, game: "daily" }), NIGHT_BREAK_MS);
  assert.equal(breakMs({ playlist, mix: false, game: "same-word" }), NEXT_GAME_MS);
  assert.equal(breakMs({ playlist: ["flags"], mix: false, game: "flags" }), NEXT_GAME_MS);
  const env = process.env.POLINGUAL_LOBBY_SETUP;
  process.env.POLINGUAL_LOBBY_SETUP = "on";
  try {
    const patch = normalizeLobbySettings({ setup: "sequence", games: playlist, targets: ["es", "fr"] }, { game: "flags", root: "en", targets: ["es"], status: "lobby" });
    assert.deepEqual(patch?.playlist, playlist);
    assert.equal(nextGame({ game: "tiles", playlist, mix: false, seed: "1", targets: ["es", "fr"] }), "same-word");
  } finally {
    process.env.POLINGUAL_LOBBY_SETUP = env;
  }
});

test("a trailing player steals when someone ahead already missed the final question", () => {
  const players = [{ user_id: "lead", score: 900 }, { user_id: "mid", score: 500 }, { user_id: "low", score: 100 }];
  assert.equal(stealBonus("low", players, [{ user_id: "lead", correct: false }]), STEAL_POINTS);
  assert.equal(stealBonus("low", players, [{ user_id: "lead", correct: true }]), 0);
  assert.equal(stealBonus("lead", players, [{ user_id: "low", correct: false }]), 0);
  assert.equal(stealBonus("mid", players, [{ user_id: "low", correct: false }]), 0);
  assert.equal(stealBonus("mid", players, []), 0);
});

test("the audience opens past the player cap or once a game started, never to an under-13 or unknown account, and to guests only when the host allows it", () => {
  const full = Array.from({ length: LOBBY_CAP }, (_, i) => `p${i}`);
  const adult = { guest: false as const, band: "18plus" };
  const off = { status: "playing" as const, standing_slot: null };
  assert.equal(audienceDecision({ status: "lobby", standing_slot: null }, full, "x", adult), "audience");
  assert.equal(audienceDecision(off, ["a", "b"], "x", { guest: false, band: "13to17" }), "audience");
  assert.equal(audienceDecision({ status: "lobby", standing_slot: null }, ["a"], "x", adult), "seat_open");
  assert.equal(audienceDecision(off, ["a"], "x", { guest: false, band: "under13" }), "under13");
  assert.equal(audienceDecision(off, ["a"], "x", { guest: false, band: null }), "under13");
  assert.equal(audienceDecision(off, ["a", "x"], "x", adult), "player");
  assert.equal(audienceDecision({ status: "done", standing_slot: null }, ["a"], "x", adult), "closed");
  assert.equal(audienceDecision({ status: "playing", standing_slot: "daily-romance" }, ["a"], "x", adult), "closed");
  assert.equal(audienceDecision(off, ["a"], "g", { guest: true }), "guests_off");
  assert.equal(audienceDecision({ ...off, guests_watch: false }, ["a"], "g", { guest: true }), "guests_off");
  assert.equal(audienceDecision({ ...off, guests_watch: true }, ["a"], "g", { guest: true }), "audience");
});

test("bonus tallies count one stored vote per voter per round", () => {
  const t = bonusTallies([
    { round: 4, user_id: "a", choice: "es:gato" },
    { round: 4, user_id: "b", choice: "fr:chat" },
    { round: 4, user_id: "c", choice: "es:gato" },
    { round: 4, user_id: "a", choice: "fr:chat" },
    { round: 2, user_id: "a", choice: "x" },
  ]);
  assert.deepEqual(t, [
    { round: 2, choices: [{ choice: "x", votes: 1 }], total: 1 },
    { round: 4, choices: [{ choice: "es:gato", votes: 2 }, { choice: "fr:chat", votes: 1 }], total: 3 },
  ]);
});

test("the final caps the answer multiplier at x2, with or without a double power", () => {
  assert.equal(answerMultiplier(true, true), 2);
  assert.equal(answerMultiplier(true, false), 2);
  assert.equal(answerMultiplier(false, true), 2);
  assert.equal(answerMultiplier(false, false), 1);
});

test("room signals carry one of 8 fixed reactions or a vote, nothing else", () => {
  assert.equal(REACTIONS.length, 8);
  for (const emoji of REACTIONS) assert.deepEqual(roomSignal({ emoji }), { kind: "react", emoji });
  assert.equal(roomSignal({ emoji: "💩" }), null);
  assert.equal(roomSignal({ emoji: "<b>hi</b>" }), null);
  assert.deepEqual(roomSignal({ round: 2, choice: "es:gato" }), { kind: "vote", round: 2, choice: "es:gato" });
  assert.equal(roomSignal({ round: -1, choice: "x" }), null);
  assert.equal(roomSignal({ round: 1, choice: "x".repeat(81) }), null);
  assert.equal(roomSignal(null), null);
});

test("night breaks run Voice Atlas clips then Family Teach, and Forehead cards then Our Trivia", () => {
  const playlist = FAMILY_NIGHT.map((r) => r.game);
  const base = { playlist, mix: false, status: "done", started_at: new Date(T0).toISOString(), rounds: 2, round_seconds: 10, reveal_seconds: 0, ended_at: null };
  const end = T0 + 20_000;
  assert.deepEqual(interludeAt({ ...base, game: "daily" }, end + 25_000), { kind: "voice-atlas", clip: 2, endsAt: end + 36_000 });
  assert.deepEqual(interludeAt({ ...base, game: "daily" }, end + 60_000), { kind: "family-teach" });
  assert.deepEqual(interludeAt({ ...base, game: "tiles" }, end + 31_000), { kind: "forehead", card: 2, endsAt: end + 45_000 });
  assert.deepEqual(interludeAt({ ...base, game: "tiles" }, end + 90_000), { kind: "our-trivia" });
  assert.equal(interludeAt({ ...base, game: "same-word" }, end + 1000), null);
  assert.equal(interludeAt({ ...base, game: "daily", status: "playing" }, end + 1000), null);
  assert.equal(interludeAt({ ...base, game: "daily", ended_at: new Date(end).toISOString() }, end + 1000), null);
  assert.equal(interludeAt({ ...base, game: "daily" }, end - 1), null);
  assert.equal(nextGameDue({ ...base, game: "daily", status: "done" } as never, end + NEXT_GAME_MS), false);
  assert.equal(nextGameDue({ ...base, game: "daily", status: "done" } as never, end + NIGHT_BREAK_MS), true);
});

test("the forehead holder rotates through humans in a fixed order, bots never hold", () => {
  const seats = [{ user_id: "c" }, { user_id: "a" }, { user_id: "bot", is_bot: true }, { user_id: "b" }];
  assert.deepEqual([0, 1, 2, 3].map((c) => foreheadHolder(seats, c)), ["a", "b", "c", "a"]);
  assert.equal(foreheadHolder([{ user_id: "bot", is_bot: true }], 0), null);
});

test("the audience votes only on the final's last question", () => {
  const playlist = FAMILY_NIGHT.map((r) => r.game);
  const final = { status: "playing", playlist, mix: false, game: "same-word", rounds: 6 };
  assert.equal(bonusQuestion(final, 5), true);
  assert.equal(bonusQuestion(final, 4), false);
  assert.equal(bonusQuestion({ ...final, game: "daily" }, 5), false);
  assert.equal(bonusQuestion({ ...final, status: "done" }, 5), false);
  assert.equal(bonusQuestion({ ...final, playlist: ["same-word"] }, 5), false);
});
