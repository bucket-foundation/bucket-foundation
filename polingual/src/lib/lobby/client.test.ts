import assert from "node:assert/strict";
import { test } from "node:test";
import { answeredRound, botLabel, flagEmoji, cleanNickname, gameProgress, gameSeconds, langFlag, livesLeft, ranked, revealOrder, streakOf, LobbyApi, LobbyError, memoryGuestStore, missedWords, newGuestId, phaseAt, resolveIdentity, serverOffset, shareUrl, standings, tallyLate, TALLY_WAIT_MS, tokenFresh, type WebLobbyState } from "./client";

test("phase follows the server clock", () => {
  const lobby = { status: "playing" as const, startedAt: new Date(10_000).toISOString(), rounds: 3, roundSeconds: 10 };
  assert.deepEqual(phaseAt(lobby, 8_000), { kind: "countdown", seconds: 2 });
  assert.deepEqual(phaseAt(lobby, 25_000), { kind: "round", index: 1, remaining: 5 });
  assert.deepEqual(phaseAt(lobby, 40_000), { kind: "finished" });
  assert.deepEqual(phaseAt({ ...lobby, status: "lobby" }, 0), { kind: "waiting" });
  assert.deepEqual(phaseAt({ ...lobby, status: "done" }, 0), { kind: "finished" });
  assert.equal(serverOffset(new Date(1_500).toISOString(), 1_000, 1_000), 500);
});

test("a reveal gap sits between rounds and none after the last", () => {
  const lobby = { status: "playing" as const, startedAt: new Date(10_000).toISOString(), rounds: 3, roundSeconds: 8, revealSeconds: 4 };
  assert.equal(gameSeconds(lobby), 32);
  assert.deepEqual(phaseAt(lobby, 17_000), { kind: "round", index: 0, remaining: 1 });
  assert.deepEqual(phaseAt(lobby, 19_000), { kind: "reveal", index: 0, remaining: 3 });
  assert.deepEqual(phaseAt(lobby, 22_000), { kind: "round", index: 1, remaining: 8 });
  assert.deepEqual(phaseAt(lobby, 41_000), { kind: "round", index: 2, remaining: 1 });
  assert.deepEqual(phaseAt(lobby, 42_000), { kind: "finished" });
  assert.equal(gameProgress({ kind: "round", index: 1, remaining: 3 }, 3), 1 / 3);
  assert.equal(gameProgress({ kind: "reveal", index: 1, remaining: 3 }, 3), 2 / 3);
  assert.equal(gameProgress({ kind: "finished" }, 3), 1);
  assert.equal(gameProgress({ kind: "waiting" }, 3), 0);
});

test("standard games run 60 to 90 seconds", () => {
  for (const g of [{ rounds: 6, roundSeconds: 8 }, { rounds: 7, roundSeconds: 7 }, { rounds: 8, roundSeconds: 6 }]) {
    const s = gameSeconds({ ...g, revealSeconds: 4 });
    assert.ok(s >= 60 && s <= 90, `${g.rounds}x${g.roundSeconds} runs ${s}s`);
  }
});

test("guest helpers", () => {
  assert.equal(newGuestId(() => new Uint8Array([0, 255, 16])), "00ff10");
  assert.equal(cleanNickname("  Ana  Lu "), "Ana Lu");
  assert.equal(cleanNickname("a"), null);
  assert.equal(tokenFresh({ guestId: "g", nickname: "n", token: "t", expiresAt: new Date(200_000).toISOString() }, 100_000), true);
  assert.equal(tokenFresh({ guestId: "g", nickname: "n", token: "t", expiresAt: new Date(120_000).toISOString() }, 100_000), false);
  assert.equal(tokenFresh({ guestId: "g", nickname: "n" }, 0), false);
  assert.equal(shareUrl("https://polingual.com/", "ABC123"), "https://polingual.com/play/ABC123");
});

test("api sends the bearer and maps errors", async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const api = new LobbyApi({
    auth: async () => "tok",
    fetch: (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ error: "lobby_full" }), { status: 409 });
    }) as unknown as typeof fetch,
  });
  await assert.rejects(api.join({ code: "ABC123", displayName: "Ana" }), (e: unknown) => e instanceof LobbyError && e.code === "lobby_full" && e.status === 409);
  assert.equal(seen[0].url, "/api/academy/lobbies/join");
  assert.equal((seen[0].init.headers as Record<string, string>).authorization, "Bearer tok");
  const off = new LobbyApi({ auth: async () => null, fetch: (async () => { throw new Error("x"); }) as unknown as typeof fetch });
  await assert.rejects(off.state("id", 3), (e: unknown) => e instanceof LobbyError && e.code === "offline");
});

function fakeApi() {
  const calls: string[] = [];
  return {
    calls,
    api: {
      guest: async (id: string, nick: string) => {
        calls.push(`guest:${id}:${nick}`);
        return { token: `gt-${nick}`, userId: `g-${id}`, expiresAt: new Date(10_000_000).toISOString() };
      },
      merge: async (t: string) => {
        calls.push(`merge:${t}`);
      },
    },
  };
}

test("identity prefers the account and merges a fresh guest token once", async () => {
  const f = fakeApi();
  const store = memoryGuestStore({ guestId: "aa", nickname: "Ana", token: "gt-old", expiresAt: new Date(10_000_000).toISOString() });
  const id = await resolveIdentity({ api: f.api, store, account: async () => "acct", now: () => 0 });
  assert.deepEqual(id, { token: "acct", kind: "account" });
  assert.deepEqual(f.calls, ["merge:gt-old"]);
  assert.equal(store.value, null);
  await resolveIdentity({ api: f.api, store, account: async () => "acct", now: () => 0 });
  assert.deepEqual(f.calls, ["merge:gt-old"]);
});

test("identity refreshes a stale guest token before the merge", async () => {
  const f = fakeApi();
  const store = memoryGuestStore({ guestId: "aa", nickname: "Ana", token: "gt-old", expiresAt: new Date(1).toISOString() });
  await resolveIdentity({ api: f.api, store, account: async () => "acct", now: () => 0 });
  assert.deepEqual(f.calls, ["guest:aa:Ana", "merge:gt-Ana"]);
  assert.equal(store.value, null);
});

test("identity keeps the guest when merge fails so a retry can run", async () => {
  const store = memoryGuestStore({ guestId: "aa", nickname: "Ana", token: "gt", expiresAt: new Date(10_000_000).toISOString() });
  const api = { guest: fakeApi().api.guest, merge: async () => { throw new Error("down"); } };
  assert.deepEqual(await resolveIdentity({ api, store, account: async () => "acct", now: () => 0 }), { token: "acct", kind: "account" });
  assert.equal(store.value?.token, "gt");
});

test("identity issues a guest token and reuses it until the nickname changes", async () => {
  const f = fakeApi();
  const store = memoryGuestStore();
  assert.equal(await resolveIdentity({ api: f.api, store, account: async () => null, now: () => 0 }), null);
  const a = await resolveIdentity({ api: f.api, store, account: async () => null, now: () => 0 }, " Ana ");
  assert.deepEqual(a, { token: "gt-Ana", kind: "guest" });
  const gid = store.value?.guestId;
  await resolveIdentity({ api: f.api, store, account: async () => null, now: () => 0 });
  assert.equal(f.calls.length, 1);
  await resolveIdentity({ api: f.api, store, account: async () => null, now: () => 0 }, "Bea");
  assert.equal(f.calls[1], `guest:${gid}:Bea`);
});

test("standings, missed words and answered rounds come from server results", () => {
  const lobby = {
    players: [
      { userId: "u1", name: "Bo", score: 100, isMe: false },
      { userId: "u2", name: "Al", score: 300, isMe: true },
    ],
    prompts: [
      { round: 0, answer: "agua" },
      { round: 1, answer: "fuego" },
      { round: 2, answer: null },
    ],
    results: [{ round: 0, userId: "u2", correct: true }, { round: 1, userId: "u2", correct: false }],
  } as unknown as WebLobbyState;
  assert.deepEqual(standings(lobby).map((p) => p.name), ["Al", "Bo"]);
  assert.deepEqual(missedWords(lobby), ["fuego"]);
  assert.equal(answeredRound(lobby, 1), true);
  assert.equal(answeredRound(lobby, 2), false);
});

test("results wait for the server tally, then stop waiting", () => {
  const lobby = { startedAt: "2026-11-12T00:00:00.000Z", rounds: 5, roundSeconds: 10 };
  const end = Date.parse(lobby.startedAt) + 50_000;
  assert.equal(tallyLate(lobby, end + 1000), false);
  assert.equal(tallyLate(lobby, end + TALLY_WAIT_MS + 1), true);
  assert.equal(tallyLate({ ...lobby, startedAt: null }, end + 60_000), false);
  const gapped = { ...lobby, revealSeconds: 4 };
  assert.equal(tallyLate(gapped, end + 16_000 + TALLY_WAIT_MS), false);
  assert.equal(tallyLate(gapped, end + 16_000 + TALLY_WAIT_MS + 1), true);
});

test("ranked shares a rank on ties and keeps everyone, bots included", () => {
  const p = (userId: string, score: number, bot = false) => ({ userId, name: userId, handle: null, ready: true, score, isHost: false, isMe: userId === "me", online: true, answered: false, bot, skill: bot ? "easy" : null, flag: null, firstRound: 0 });
  const rows = ranked([p("a", 100), p("me", 300), p("bot", 100, true), p("z", 0)]);
  assert.deepEqual(rows.map((r) => [r.userId, r.rank]), [["me", 1], ["a", 2], ["bot", 2], ["z", 4]]);
});

test("streak, lives and reveal order", () => {
  const players = [{ userId: "me", isMe: true }] as WebLobbyState["players"];
  const r = (round: number, correct: boolean) => ({ round, userId: "me", correct, ms: 0, points: 0 });
  assert.equal(streakOf({ players, results: [r(0, false), r(1, true), r(2, true)] }), 2);
  assert.equal(streakOf({ players, results: [r(0, true), r(2, true)] }), 1);
  assert.equal(livesLeft({ players, results: [r(0, false), r(1, true)] }, 3), 1);
  assert.equal(livesLeft({ players, results: [] }, 2), 3);
  assert.deepEqual(revealOrder([{ correct: false, w: "a" }, { correct: true, w: "b" }, { correct: true, w: "c" }]).map((e) => e.w), ["b", "c", "a"]);
  assert.equal(langFlag("pt-BR"), "PT");
  assert.equal(langFlag("xx"), null);
});

test("bots render a flag and a skill label", () => {
  assert.equal(flagEmoji("ES"), "\u{1F1EA}\u{1F1F8}");
  assert.equal(flagEmoji("es"), "");
  assert.equal(flagEmoji(null), "");
  assert.equal(botLabel({ bot: true, skill: "hard" }), "bot · hard");
  assert.equal(botLabel({ bot: true, skill: null }), "bot");
  assert.equal(botLabel({ bot: false, skill: null }), null);
});
