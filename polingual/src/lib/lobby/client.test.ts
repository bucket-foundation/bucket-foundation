import assert from "node:assert/strict";
import { test } from "node:test";
import { adConfig, adShows } from "./ads";
import { cleanNickname, LobbyApi, LobbyError, newGuestId, phaseAt, serverOffset, shareUrl, tokenFresh } from "./client";

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
  assert.equal(shareUrl("https://polingual.com/", "ABC123"), "https://polingual.com/join/ABC123");
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
