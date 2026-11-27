import { test } from "node:test";
import assert from "node:assert/strict";
import type { LobbyState } from "./client";
import { draftChanged, draftOf, readyLine, roundTitle, settingsBody, setupGames, waitingRows } from "./waiting";

type Player = LobbyState["players"][number];

function player(over: Partial<Player>): Player {
  return { userId: "u", name: "n", handle: null, ready: false, score: 0, isHost: false, isMe: false, online: true, answered: false, bot: false, skill: null, flag: null, firstRound: 0, continues: 0, ...over };
}

const players = [player({ userId: "b", name: "Bea" }), player({ userId: "a", name: "Ana", ready: true }), player({ userId: "h", name: "Zed", isHost: true, isMe: true })];

test("waitingRows puts the host first, then ready players, then names", () => {
  assert.deepEqual(waitingRows({ players }).map((r) => r.id), ["h", "a", "b"]);
  assert.equal(waitingRows({ players })[0].me, true);
});

test("readyLine counts ready players", () => {
  assert.equal(readyLine({ players }), "1 of 3 ready");
});

test("setupGames and draftOf read each setup mode", () => {
  const base = { players, game: "flags" as const, targets: ["es", "fr"] };
  assert.deepEqual(setupGames({ ...base, setup: "single", playlist: ["flags"] }), ["flags"]);
  assert.deepEqual(setupGames({ ...base, setup: "sequence", playlist: ["flags", "tiles"] }), ["flags", "tiles"]);
  assert.deepEqual(draftOf({ ...base, setup: "sequence", playlist: ["flags", "tiles"] }), { mode: "sequence", game: "flags", games: ["flags", "tiles"], langs: ["es", "fr"] });
  assert.deepEqual(draftOf({ ...base, setup: "mix", playlist: ["flags", "tiles"] }).games, []);
});

test("settingsBody sends what the server route validates", () => {
  assert.deepEqual(settingsBody({ mode: "single", game: "tiles", games: [], langs: ["es"] }), { setup: "single", game: "tiles", targets: ["es"] });
  assert.deepEqual(settingsBody({ mode: "sequence", game: "x", games: ["flags", "daily"], langs: ["es"] }), { setup: "sequence", games: ["flags", "daily"], targets: ["es"] });
  assert.deepEqual(settingsBody({ mode: "mix", game: "x", games: [], langs: ["de"] }), { setup: "mix", targets: ["de"] });
});

test("draftChanged spots edits to games or languages", () => {
  const lobby = { players, game: "flags" as const, targets: ["es"], setup: "single" as const, playlist: ["flags" as const] };
  const d = draftOf(lobby);
  assert.equal(draftChanged(d, lobby), false);
  assert.equal(draftChanged({ ...d, game: "tiles" }, lobby), true);
  assert.equal(draftChanged({ ...d, langs: ["es", "fr"] }, lobby), true);
  assert.equal(draftChanged({ ...d, mode: "mix" }, lobby), true);
});

test("a family night reads back as night mode and titles each round", () => {
  const playlist = ["daily", "flags", "tiles", "same-word"] as never[];
  const lobby = { players, game: "flags" as const, targets: ["es", "fr"], setup: "sequence" as const, playlist };
  assert.equal(draftOf(lobby).mode, "night");
  assert.deepEqual(settingsBody({ mode: "night", game: "x", games: [], langs: ["es", "fr"] }), { setup: "sequence", games: ["daily", "flags", "tiles", "same-word"], targets: ["es", "fr"] });
  assert.equal(roundTitle({ playlist, game: "flags" }), "Voice Atlas, round 2 of 4");
  assert.equal(roundTitle({ playlist, game: "same-word" }), "Final: double points, steals on");
  assert.equal(roundTitle({ playlist: ["flags", "tiles"] as never[], game: "flags" }), null);
});
