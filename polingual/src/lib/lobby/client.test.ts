import assert from "node:assert/strict";
import { test } from "node:test";
import { adConfig, adShows } from "./ads";
import { answeredRound, cleanNickname, LobbyApi, LobbyError, memoryGuestStore, missedWords, newGuestId, phaseAt, resolveIdentity, serverOffset, shareUrl, standings, tallyLate, TALLY_WAIT_MS, tokenFresh, type WebLobbyState } from "./client";

test("ads stay off unless the flag and a valid client are set", () => {
  assert.equal(adConfig({}).mode, "off");
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "adsense" }).mode, "off");
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "adsense", NEXT_PUBLIC_ADSENSE_CLIENT: "pub-1" }).mode, "off");
  const on = adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "adsense-test", NEXT_PUBLIC_ADSENSE_CLIENT: "ca-pub-1234567890123456", NEXT_PUBLIC_ADSENSE_SLOT_RESULTS: "1234567890" });
  assert.equal(on.mode, "adsense-test");
  assert.equal(adShows(on, "results"), true);
  assert.equal(adShows(on, "lobby"), false);
  const ph = adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "placeholder" });
  assert.equal(adShows(ph, "between-rounds"), true);
  assert.equal(adShows(adConfig({}), "results"), false);
});

test("phase follows the server clock", () => {
  const lobby = { status: "playing" as const, startedAt: new Date(10_000).toISOString(), rounds: 3, roundSeconds: 10 };
  assert.deepEqual(phaseAt(lobby, 8_000), { kind: "countdown", seconds: 2 });
  assert.deepEqual(phaseAt(lobby, 25_000), { kind: "round", index: 1, remaining: 5 });
  assert.deepEqual(phaseAt(lobby, 40_000), { kind: "finished" });
  assert.deepEqual(phaseAt({ ...lobby, status: "lobby" }, 0), { kind: "waiting" });
  assert.deepEqual(phaseAt({ ...lobby, status: "done" }, 0), { kind: "finished" });
  assert.equal(serverOffset(new Date(1_500).toISOString(), 1_000, 1_000), 500);
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
});
