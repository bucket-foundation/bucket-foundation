import { test } from "node:test";
import assert from "node:assert/strict";
import type { LobbyState } from "./client";
import { draftChanged, draftOf, nightStep, readyLine, roomInterlude, roundTitle, settingsBody, setupGames, waitingRows } from "./waiting";

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
  const playlist = ["daily", "tiles", "same-word"] as never[];
  const lobby = { players, game: "tiles" as const, targets: ["es", "fr"], setup: "sequence" as const, playlist };
  assert.equal(draftOf(lobby).mode, "night");
  assert.deepEqual(settingsBody({ mode: "night", game: "x", games: [], langs: ["es", "fr"] }), { setup: "sequence", games: ["daily", "tiles", "same-word"], targets: ["es", "fr"] });
  assert.equal(roundTitle({ playlist, game: "tiles" }), "Picture Race, round 2 of 3");
  assert.equal(roundTitle({ playlist, game: "same-word" }), "Final: double points, steals on");
  assert.equal(roundTitle({ playlist: ["flags", "tiles"] as never[], game: "flags" }), null);
});

test("the night breaks run Voice Atlas then Family Teach, and Forehead then Our Trivia", () => {
  const playlist = ["daily", "tiles", "same-word"] as never[];
  const t0 = Date.parse("2026-11-27T10:00:00.000Z");
  const base = { playlist, status: "done" as const, startedAt: new Date(t0).toISOString(), rounds: 2, roundSeconds: 10, revealSeconds: 0 };
  const end = t0 + 20_000;
  assert.deepEqual(roomInterlude({ ...base, game: "daily" }, end + 1000), { kind: "voice-atlas", clip: 0, endsAt: end + 12_000 });
  assert.equal(roomInterlude({ ...base, game: "daily" }, end + 49_000)?.kind, "voice-atlas");
  assert.equal(roomInterlude({ ...base, game: "daily" }, end + 61_000)?.kind, "family-teach");
  assert.deepEqual(roomInterlude({ ...base, game: "tiles" }, end + 16_000), { kind: "forehead", card: 1, endsAt: end + 30_000 });
  assert.equal(roomInterlude({ ...base, game: "tiles" }, end + 91_000)?.kind, "our-trivia");
  assert.equal(roomInterlude({ ...base, game: "same-word" }, end + 1000), null);
  assert.equal(roomInterlude({ ...base, game: "daily", ended: true }, end + 1000), null);
  assert.equal(nightStep({ ...base, game: "daily" }, end + 1000), "Voice Atlas");
  assert.equal(nightStep({ ...base, game: "tiles" }, end + 1000), "Forehead");
});
