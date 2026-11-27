import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SCREEN_CAP, screenJoinDecision, seatAllowed, wantsScreen } from "@academy/lobbies";
import { tvPath } from "./tv";

const ROUTES = join(process.cwd(), "../src/app/api/academy/lobbies");
const route = (name: string) => readFileSync(join(ROUTES, name, "route.ts"), "utf8");

test("wantsScreen reads only a literal true screen flag", () => {
  assert.equal(wantsScreen({ screen: true }), true);
  assert.equal(wantsScreen({ screen: "true" }), false);
  assert.equal(wantsScreen({}), false);
  assert.equal(wantsScreen(null), false);
});

test("screen join adds a new screen to an open or started lobby", () => {
  assert.equal(screenJoinDecision({ status: "lobby" }, ["a"], [], "tv"), "add");
  assert.equal(screenJoinDecision({ status: "playing" }, ["a"], ["s1"], "tv"), "add");
});

test("screen join keeps an existing player as a player", () => {
  assert.equal(screenJoinDecision({ status: "lobby" }, ["tv"], [], "tv"), "player");
});

test("screen join is idempotent for a duplicate screen", () => {
  assert.equal(screenJoinDecision({ status: "playing" }, [], ["tv"], "tv"), "screen");
  assert.equal(screenJoinDecision({ status: "lobby" }, [], ["s1", "s2", "tv"], "tv"), "screen");
});

test("screen join caps screens per lobby", () => {
  const full = Array.from({ length: SCREEN_CAP }, (_, i) => `s${i}`);
  assert.equal(SCREEN_CAP, 3);
  assert.equal(screenJoinDecision({ status: "lobby" }, [], full, "tv"), "full");
});

test("screen join rejects closed lobbies", () => {
  assert.equal(screenJoinDecision({ status: "done" }, [], [], "tv"), "closed");
});

test("a screen seat reads state and nothing else", () => {
  assert.equal(seatAllowed("player", false), true);
  assert.equal(seatAllowed("screen", true), true);
  assert.equal(seatAllowed("screen", false), false);
  assert.equal(seatAllowed(null, true), false);
});

const HOST_ONLY = new Set(["start", "settings", "next", "end", "bots", "hostmode"]);

test("only the state route admits screen seats, and only host-only routes admit a seatless host", () => {
  for (const name of readdirSync(ROUTES, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    let src: string;
    try {
      src = route(name);
    } catch {
      continue;
    }
    const calls = (src.match(/memberLobby\(/g) ?? []).length;
    const playerOnly = (src.match(/memberLobby\(a\.uid, a\.body\??\.lobbyId\)/g) ?? []).length;
    const hostOnly = (src.match(/memberLobby\(a\.uid, a\.body\??\.lobbyId, false, true\)/g) ?? []).length;
    if (name === "state") assert.match(src, /memberLobby\(a\.uid, params\.get\("lobbyId"\), true, true\)/);
    else if (name === "react") assert.equal((src.match(/memberLobby\(a\.uid, [^,()]+, true, true\)/g) ?? []).length, calls, "react admits every seat in the room");
    else if (name === "bonus") assert.equal(playerOnly + hostOnly, calls, "bonus admits players, and its host for forehead marks");
    else if (HOST_ONLY.has(name)) assert.equal(hostOnly, calls, `${name} admits players and its host`);
    else assert.equal(playerOnly, calls, `${name} must admit players only`);
  }
  for (const name of ["answer", "chat", "ready", "power", "continue", "score"]) assert.match(route(name), /memberLobby\(a\.uid, a\.body\??\.lobbyId\)/);
  for (const name of HOST_ONLY) assert.match(route(name), /host_id !== a\.uid\) return json\(\{ error: "not_host" \}, 403\)|decision === "not_host"/);
});

test("join route answers a full screen cap with lobby_full and a closed lobby with not_found", () => {
  const src = route("join");
  assert.match(src, /seat === "full"\) return json\(\{ error: "lobby_full" \}, 409\)/);
  assert.match(src, /seat === "closed"\) return json\(\{ error: "not_found" \}, 404\)/);
  assert.ok(src.indexOf("hiddenUsers(blocks") < src.indexOf("wantsScreen(a.body)"), "blocked users are refused before a screen seat");
});

test("state route refreshes last_seen for screens", () => {
  assert.match(route("state"), /\[PLAYERS, SCREENS\]/);
});

test("tvPath points at the TV screen for a room", () => {
  assert.equal(tvPath("ABC123"), "/play/tv/ABC123");
});
