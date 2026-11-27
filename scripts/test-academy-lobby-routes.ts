import "./lobby-test-env";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import * as groups from "../src/lib/academy/groups-server";
import { fakeDb, type Row } from "./lobby-fake-db";

const ID = "00000000-0000-4000-8000-0000000000c3";
const T = new Date(Date.now() - 60_000).toISOString();

function room(over: Row = {}): Row {
  return { id: ID, code: "ABC234", host_id: "h", name: "R", game: "flags", root: "en", targets: ["es"], seed: "1", status: "lobby", listed: true, rounds: 2, round_seconds: 10, reveal_seconds: 0, started_at: null, version: 3, created_at: T, standing_slot: null, playlist: ["flags"], mix: false, start_at: null, ended_at: null, setup: "single", bot_fill: false, ...over };
}

function seat(uid: string, score = 0): Row {
  return { lobby_id: ID, user_id: uid, display_name: uid.toUpperCase(), ready: false, score, total: 0, last_seen: new Date().toISOString(), joined_at: T, is_bot: false, skill: null, flag: null };
}

function setup(lobby: Row, players: Row[]) {
  const { db, tables } = fakeDb({ lobbies: [lobby], lobby_players: players, lobby_screens: [], lobby_messages: [], lobby_prompts: [], lobby_answers: [], group_blocks: [], lobby_message_reports: [] }, { lobby_players: ["lobby_id", "user_id"] });
  const g = groups as unknown as Record<string, unknown>;
  g.service = () => db;
  g.requestUser = async (r: NextRequest) => r.headers.get("x-test-user");
  g.blocksTouching = async () => [];
  return tables;
}

function join(uid: string | null, body: Row) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-polingual-client": "web" };
  if (uid) headers["x-test-user"] = uid;
  return new NextRequest("http://x/api/academy/lobbies/join", { method: "POST", headers, body: JSON.stringify(body) });
}

function state(uid: string, since?: number) {
  return new NextRequest(`http://x/api/academy/lobbies/state?lobbyId=${ID}${since === undefined ? "" : `&since=${since}`}`, { headers: { "x-test-user": uid } });
}

async function body(r: Response): Promise<Record<string, unknown>> {
  return (await r.json()) as Record<string, unknown>;
}

test("join: anonymous callers get 401, bad names 400, unknown codes 404", async () => {
  setup(room(), [seat("h")]);
  const { POST } = await import("../src/app/api/academy/lobbies/join/route");
  assert.equal((await POST(join(null, { code: "ABC234", displayName: "Ana" }))).status, 401);
  assert.equal((await POST(join("p", { code: "ABC234", displayName: "" }))).status, 400);
  assert.equal((await POST(join("p", { code: "ZZZ999", displayName: "Ana" }))).status, 404);
});

test("join: a new player takes a seat and gets the lobby state", async () => {
  const tables = setup(room(), [seat("h")]);
  const { POST } = await import("../src/app/api/academy/lobbies/join/route");
  const r = await POST(join("p", { code: "abc-234", displayName: "Ana" }));
  assert.equal(r.status, 200);
  const lobby = (await body(r)).lobby as { id: string; players: { userId: string; isMe: boolean }[] };
  assert.equal(lobby.id, ID);
  assert.ok(lobby.players.some((p) => p.userId === "p" && p.isMe));
  assert.ok(tables.lobby_players.some((p) => p.user_id === "p"));
});

test("join: a dropped phone rejoins its seat mid-game and keeps its score; a stranger is turned away", async () => {
  const started = new Date(Date.now() - 5_000).toISOString();
  const tables = setup(room({ status: "playing", started_at: started }), [seat("h"), seat("p", 300)]);
  const { POST } = await import("../src/app/api/academy/lobbies/join/route");
  const back = await POST(join("p", { code: "ABC234", displayName: "Ana" }));
  assert.equal(back.status, 200);
  assert.equal(tables.lobby_players.filter((x) => x.user_id === "p").length, 1);
  assert.equal(tables.lobby_players.find((x) => x.user_id === "p")?.score, 300);
  const late = await POST(join("x", { code: "ABC234", displayName: "Eli" }));
  assert.equal(late.status, 409);
  assert.equal((await body(late)).error, "lobby_started");
});

test("state: members poll the lobby, unchanged versions short-circuit, outsiders get 404", async () => {
  setup(room(), [seat("h"), seat("p")]);
  const { GET } = await import("../src/app/api/academy/lobbies/state/route");
  const fresh = await body(await GET(state("p")));
  assert.equal(fresh.changed, true);
  assert.equal((fresh.lobby as { id: string }).id, ID);
  const same = await body(await GET(state("p", 3)));
  assert.equal(same.changed, false);
  assert.equal(same.version, 3);
  const outsider = await GET(state("x"));
  assert.equal(outsider.status, 404);
  assert.deepEqual(await body(outsider), { error: "not_found" });
});
