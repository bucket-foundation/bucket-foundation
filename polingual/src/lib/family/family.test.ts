import { test } from "node:test";
import assert from "node:assert/strict";
import type { LobbyState } from "@academy/lobbies";
import { cardEditable, cardReadAllowed, cardStorable, freshCard, roomCard, sharedCards } from "@academy/lobby-cards";
import { sendCard } from "./cards-api";
import { familyQuest } from "@academy/family-quest";
import { kidSeatFrom, kidSeatHref } from "./kid";
import { familyHref, familyName, readFamily, rememberFamily } from "./group";
import { bandFromAnswers, blankCard, cardReady, normalizeCard, readCard, setLevel, setReads, setSurprise, toggleLearn, toggleSpeak, writeCard } from "./card";
import { roomLanguageMap, suggestedRound } from "./langmap";
import { adoptGuestRooms, mergeRooms, readRooms, recordRoom, roomDays, ROOM_BRANCH, type RoomRecord, type SyncDeps } from "./results";
import { podium, reviewCards, roomRecord, wordOfNight } from "./after";
import { cardSvg, challengeHref, parseChallenge } from "./share";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

test("card builds by taps and caps learn languages at three", () => {
  let c = blankCard("Blue Fox");
  assert.equal(cardReady(c), false);
  c = toggleSpeak(c, "en");
  c = setLevel(c, "en", 4);
  assert.deepEqual(c.speaks[0], { lang: "en", level: 4, reads: true });
  c = setReads(c, "en", false);
  assert.equal(c.speaks[0].reads, false);
  for (const l of ["es", "fr", "de", "it"]) c = toggleLearn(c, l);
  assert.deepEqual(c.learn, ["es", "fr", "de"]);
  assert.deepEqual(toggleLearn(c, "en").learn, c.learn);
  assert.equal(cardReady(c), true);
  c = setSurprise(c, true);
  assert.deepEqual(c.learn, []);
  assert.equal(cardReady(c), true);
});

test("under-13 cards never touch device storage", () => {
  const s = memory();
  const kid = { ...toggleSpeak(blankCard("Red Owl"), "es"), band: "under13" as const };
  writeCard(s, kid);
  assert.equal(s.m.size, 0);
  const adult = toggleLearn(toggleSpeak(blankCard("Red Owl"), "es"), "en");
  writeCard(s, adult);
  assert.deepEqual(readCard(s), adult);
  writeCard(s, kid);
  assert.equal(readCard(s), null);
});

test("normalize drops bad langs, dupes and learn langs already spoken", () => {
  const c = normalizeCard({ band: "teen", nickname: "  A  B ", speaks: [{ lang: "en", level: 3 }, { lang: "en", level: 1 }, { lang: "<x>", level: 2 }], learn: ["en", "fr", "fr"], check: { fr: "A2", de: "C2" } });
  assert.deepEqual(c, { band: "teen", nickname: "A B", speaks: [{ lang: "en", level: 3 }], learn: ["fr"], surprise: false, check: { fr: "A2" } });
  assert.equal(normalizeCard({ band: "kid" }), null);
});

test("quick check band stops at the first miss", () => {
  assert.equal(bandFromAnswers([]), "pre-A1");
  assert.equal(bandFromAnswers([true, true, false, true]), "A2");
  assert.equal(bandFromAnswers([true, true, true, true]), "B2");
});

test("room map finds shared languages and the most wanted", () => {
  const map = roomLanguageMap([
    { userId: "a", name: "Abuela", card: { speaks: [{ lang: "es", level: 4 }, { lang: "en", level: 1 }], learn: ["en"], surprise: false } },
    { userId: "b", name: "Mia", card: { speaks: [{ lang: "en", level: 3 }, { lang: "es", level: 1 }], learn: ["fr"], surprise: false } },
    { userId: "c", name: "Leo", card: { speaks: [{ lang: "en", level: 3 }], learn: ["es", "fr"], surprise: false } },
  ]);
  assert.deepEqual(map.shared, [{ lang: "en", count: 3 }, { lang: "es", count: 2 }]);
  assert.deepEqual(map.wanted[0], { lang: "fr", count: 2 });
  assert.equal(suggestedRound(map), "es");
});

const now = Date.parse("2026-11-27T20:00:00Z");
function rec(key: string, savedAt: number): RoomRecord {
  return { key, code: "ABC123", day: "2026-11-27", xp: 40, rank: 1, players: 3, missed: [], savedAt };
}

test("room books merge, keep the earliest save, and list days", () => {
  const book = mergeRooms({ a: rec("a", 2) }, { a: rec("a", 1), b: { ...rec("b", 3), day: "2026-11-26" } });
  assert.equal(book.a.savedAt, 1);
  assert.deepEqual(roomDays(book), ["2026-11-26", "2026-11-27"]);
});

function server(): { deps: SyncDeps; branches: Record<string, unknown>; token: { v: string | null } } {
  const branches: Record<string, unknown> = {};
  const token = { v: null as string | null };
  const f = (async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      const b = JSON.parse(String(init.body)) as { branch: string; data: unknown };
      branches[b.branch] = b.data;
      return new Response("{}", { status: 200 });
    }
    return new Response(JSON.stringify({ branches: Object.fromEntries(Object.entries(branches).map(([k, v]) => [k, { data: v }])) }), { status: 200 });
  }) as typeof fetch;
  return { deps: { fetch: f, token: async () => token.v, user: async () => (token.v ? "u1" : null) }, branches, token };
}

test("guests keep rooms on device and merge them on sign-in", async () => {
  const s = memory();
  const srv = server();
  const first = await recordRoom(rec("r1", 1), "adult", s, srv.deps);
  assert.equal(first.saved, "device");
  assert.equal(Object.keys(readRooms(s)).length, 1);
  srv.token.v = "t";
  assert.equal(await adoptGuestRooms(s, srv.deps), "account");
  assert.deepEqual(Object.keys(readRooms(s)), []);
  const second = await recordRoom(rec("r2", 2), "teen", s, srv.deps);
  assert.equal(second.saved, "account");
  const data = srv.branches[ROOM_BRANCH] as { rooms: Record<string, RoomRecord>; days: string[] };
  assert.deepEqual(Object.keys(data.rooms).sort(), ["r1", "r2"]);
  assert.deepEqual(data.days, ["2026-11-27"]);
});

test("under-13 room results are never saved", async () => {
  const s = memory();
  const srv = server();
  srv.token.v = "t";
  assert.equal((await recordRoom(rec("r", 1), "under13", s, srv.deps)).saved, "skipped");
  assert.equal(s.m.size, 0);
  assert.equal(srv.branches[ROOM_BRANCH], undefined);
});

function lobby(): Pick<LobbyState, "id" | "code" | "startedAt" | "prompts" | "results" | "players"> {
  const reveal = (w: string) => [
    { lang: "es", word: `${w}-es`, roman: null, reading: null, meaning: w, gloss: w, correct: true },
    { lang: "fr", word: `${w}-fr`, roman: null, reading: null, meaning: w, gloss: w, correct: false },
  ];
  const players = [
    { userId: "me", name: "Mia", isMe: true, score: 30, total: 30, bot: false },
    { userId: "b", name: "Abuela", isMe: false, score: 50, total: 50, bot: false },
    { userId: "x", name: "Bot", isMe: false, score: 90, total: 90, bot: true },
  ] as LobbyState["players"];
  return {
    id: "l1",
    code: "ABC123",
    startedAt: "2026-11-27T19:00:00Z",
    players,
    prompts: ["cat", "dog", "sun"].map((w, round) => ({ round, mode: "meaning", lang: "es", gloss: w, choices: [], answer: `${w}-es`, reveal: reveal(w) })) as LobbyState["prompts"],
    results: [
      { round: 0, userId: "me", correct: true, ms: 1, points: 30 },
      { round: 1, userId: "me", correct: false, ms: 1, points: 0 },
      { round: 1, userId: "b", correct: false, ms: 1, points: 0 },
    ],
  };
}

test("review cards use the learn language and skip right answers", () => {
  assert.deepEqual(reviewCards(lobby(), ["fr"]).map((c) => c.word), ["dog-fr", "sun-fr"]);
  assert.deepEqual(reviewCards(lobby(), ["de"]).map((c) => c.word), ["dog-es", "sun-es"]);
});

test("podium skips bots and word of the night is the most missed", () => {
  assert.deepEqual(podium(lobby()).map((p) => p.name), ["Abuela", "Mia"]);
  assert.equal(wordOfNight(lobby())?.word, "dog-es");
  const r = roomRecord(lobby(), ["fr"], now);
  assert.equal(r?.rank, 3);
  assert.equal(r?.xp, 30);
  assert.equal(r?.missed.length, 2);
});

test("challenge links carry seed and score with no player id", () => {
  const href = challengeHref({ game: "flags", seed: "123", root: "en", targets: ["es", "fr"], rounds: 8, score: 120 });
  assert.equal(href, "/play/challenge?g=flags&s=123&r=en&t=es.fr&n=8&b=120");
  const back = parseChallenge(new URLSearchParams(href.split("?")[1]));
  assert.deepEqual(back, { game: "flags", seed: "123", root: "en", targets: ["es", "fr"], rounds: 8, score: 120 });
  assert.equal(parseChallenge(new URLSearchParams("g=snake&s=1&r=en&t=es&n=8"))?.game, "daily");
  assert.equal(parseChallenge(new URLSearchParams("s=abc&r=en&t=es&n=8")), null);
  assert.match(cardSvg({ podium: [{ name: "<b>", score: 1 }], langs: ["Spanish"], word: null }, { bg: "white", ink: "black", accent: "red" }), /&#60;b&#62;/);
});

test("server card rules: shape, access and 24 hour expiry", () => {
  assert.equal(roomCard({ band: "adult", speaks: [], learn: [] }), null);
  assert.deepEqual(roomCard({ band: "under13", speaks: [{ lang: "es", level: 4, reads: false }], learn: ["es", "en"], nickname: "x" }), { band: "under13", speaks: [{ lang: "es", level: 4, reads: false }], learn: ["en"], surprise: false });
  assert.equal(cardReadAllowed("s", ["a"], ["s"], "h"), true);
  assert.equal(cardReadAllowed("z", ["a"], ["s"], "h"), false);
  assert.equal(freshCard(new Date(now - 1000).toISOString(), now), true);
  assert.equal(freshCard(new Date(now - 25 * 3600 * 1000).toISOString(), now), false);
});

test("under-13 cards never leave the phone and the server refuses them", async () => {
  let calls = 0;
  const f = (async () => { calls++; return new Response("{}"); }) as unknown as typeof fetch;
  const kid = { ...toggleSpeak(blankCard("Red Owl"), "es"), band: "under13" as const };
  assert.equal(await sendCard(f, "t", "l", kid), false);
  assert.equal(calls, 0);
  assert.equal(await sendCard(f, "t", "l", { ...kid, band: "teen" }), true);
  assert.equal(calls, 1);
  assert.equal(cardStorable(roomCard({ band: "under13", speaks: [{ lang: "es", level: 2 }] })!), false);
  assert.equal(cardStorable(roomCard({ band: "adult", speaks: [{ lang: "es", level: 2 }] })!), true);
});

test("cards stay hidden when the host turns sharing off", () => {
  assert.deepEqual(sharedCards([1, 2], false), []);
  assert.deepEqual(sharedCards([1, 2], true), [1, 2]);
});

test("family quest counts games two members played together this week", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  const room = (key: string, day: string, xp = 50) => ({ key, day, xp });
  const quest = familyQuest([
    { user_id: "mom", data: { rooms: { a: room("g1|t", "2026-11-26"), b: room("g2|t", "2026-11-27"), c: room("old|t", "2026-11-20") } } },
    { user_id: "teen", data: { rooms: { a: room("g1|t", "2026-11-26", 80), d: room("old|t", "2026-11-20") } } },
  ], now);
  assert.equal(quest.weekStart, "2026-11-23");
  assert.equal(quest.done, 1);
  assert.equal(quest.goal, 5);
  assert.deepEqual(quest.xp, { mom: 100, teen: 80 });
});

test("kid seats are flagged by link and the family is remembered on the device", () => {
  assert.equal(kidSeatFrom("?seat=kid"), true);
  assert.equal(kidSeatFrom("?seat=adult"), false);
  assert.equal(kidSeatHref("ABC234"), "/play/ABC234?seat=kid");
  assert.equal(familyHref("XYZ", "https://polingual.com"), "https://polingual.com/play/family/XYZ");
  const s = memory();
  rememberFamily(s, { id: "g", name: "Rossi family", code: "XYZ" });
  assert.deepEqual(readFamily(s), { id: "g", name: "Rossi family", code: "XYZ" });
  assert.equal(familyName("Blue Fox"), "Blue family");
});

test("cards lock once a game starts and edits wait for the next waiting room", () => {
  assert.equal(cardEditable("lobby"), true);
  assert.equal(cardEditable("playing"), false);
  assert.equal(cardEditable("done"), false);
});
