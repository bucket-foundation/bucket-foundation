import "./lobby-test-env";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import * as groups from "../src/lib/academy/groups-server";
import * as gate from "../src/lib/research-os/learn-gate";
import { ATLAS_HOMES } from "../src/lib/academy/voice-atlas";
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
  const { db, tables } = fakeDb({ lobbies: [lobby], lobby_players: players, lobby_screens: [], lobby_messages: [], lobby_prompts: [], lobby_answers: [], group_blocks: [], lobby_message_reports: [] }, { lobby_players: ["lobby_id", "user_id"], lobby_bonus_claims: ["lobby_id", "started_at", "slot", "user_id"], lobby_bonus_votes: ["lobby_id", "started_at", "round", "user_id"] });
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

test("state reads purge day-old teach and trivia rows; ending a lobby drops its clips", async () => {
  const tables = setup(room(), [seat("h"), seat("p")]);
  const old = new Date(Date.now() - 25 * 3600_000).toISOString();
  const fresh = new Date().toISOString();
  tables.lobby_teach = [{ lobby_id: "other", round: 0, clip: "x", created_at: old }, { lobby_id: ID, round: 0, clip: "y", created_at: fresh }];
  tables.lobby_trivia = [{ lobby_id: "other", created_at: old }];
  const { GET } = await import("../src/app/api/academy/lobbies/state/route");
  await GET(state("p"));
  assert.deepEqual(tables.lobby_teach.map((r) => r.lobby_id), [ID]);
  assert.equal(tables.lobby_trivia.length, 0);
  process.env.POLINGUAL_LOBBY_END = "on";
  const { POST } = await import("../src/app/api/academy/lobbies/end/route");
  const res = await POST(new NextRequest("http://x/api/academy/lobbies/end", { method: "POST", headers: { "x-test-user": "h", "content-type": "application/json" }, body: JSON.stringify({ lobbyId: ID }) }));
  assert.equal(res.status, 200);
  assert.equal(tables.lobby_teach[0].clip, null);
});

test("starting an atlas lobby stores voice prompts with their clip licence", async () => {
  const tables = setup(room({ game: "atlas", rounds: 3 }), [seat("h")]);
  const words = Array.from({ length: 40 }, (_, n) => ({ id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms: { en: `en${n}`, es: `es${n}`, fr: `fr${n}`, de: `de${n}`, it: `it${n}`, ja: `ja${n}` } }));
  (groups as unknown as Record<string, unknown>).langCorpus = () => ({ items: words });
  const server = await import("../src/lib/academy/lobbies-server");
  const started = await server.startLobby(room({ game: "atlas", rounds: 3 }) as never, Date.now());
  assert.equal(started.ok, true);
  const rows = tables.lobby_prompts;
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.mode === "voice" && r.licence === "device-tts"));
});

const NIGHT = ["daily", "tiles", "same-word"];

function post(path: string, uid: string, payload: Row) {
  return new NextRequest(`http://x/api/academy/lobbies/${path}`, { method: "POST", headers: { "x-test-user": uid, "content-type": "application/json", "x-polingual-client": "web" }, body: JSON.stringify({ lobbyId: ID, ...payload }) });
}

function atlasCorpus() {
  const langs = Object.keys(ATLAS_HOMES);
  const words = Array.from({ length: 60 }, (_, n) => {
    const forms: Record<string, string> = { en: `en${n}` };
    for (const l of langs) forms[l] = `${l}${n}`;
    return { id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms };
  });
  (groups as unknown as Record<string, unknown>).langCorpus = () => ({ items: words });
}

test("atlas bonus pays once per clip from a stored claim, even when the slot spans a minute, and keeps the language hidden", async () => {
  atlasCorpus();
  const started = new Date(Date.now() - 21_000).toISOString();
  const tables = setup(room({ status: "done", game: "daily", playlist: NIGHT, started_at: started }), [seat("h"), seat("p")]);
  const { POST } = await import("../src/app/api/academy/lobbies/bonus/route");
  const first = await POST(post("bonus", "p", { kind: "atlas", clip: 0, lat: 40, lon: -3 }));
  assert.equal(first.status, 200);
  const paid = await body(first);
  assert.equal("lang" in paid, false);
  const again = await POST(post("bonus", "p", { kind: "atlas", clip: 0, lat: 40, lon: -3 }));
  assert.equal(again.status, 409);
  assert.equal(tables.lobby_players.find((x) => x.user_id === "p")?.score, paid.points);
  assert.equal(tables.lobby_bonus_claims.length, 1);
});

test("night atlas rounds hide the language from phones until the clip closes; the TV seat hears it", async () => {
  atlasCorpus();
  const started = new Date(Date.now() - 21_000 - 12_500).toISOString();
  const tables = setup(room({ status: "done", game: "daily", playlist: NIGHT, started_at: started }), [seat("h"), seat("p")]);
  tables.lobby_screens.push({ lobby_id: ID, user_id: "tv", role: "screen", last_seen: new Date().toISOString() });
  process.env.POLINGUAL_LOBBY_AUDIENCE = "on";
  const { GET } = await import("../src/app/api/academy/lobbies/atlas/route");
  const get = (uid: string) => new NextRequest(`http://x/api/academy/lobbies/atlas?lobbyId=${ID}`, { headers: { "x-test-user": uid } });
  const phone = (await body(await GET(get("p")))).rounds as { clip: number; lang?: string }[];
  assert.ok(phone[0].lang);
  assert.ok(phone.slice(1).every((r) => r.lang === undefined));
  const tv = (await body(await GET(get("tv")))).rounds as { lang?: string }[];
  assert.ok(tv.every((r) => typeof r.lang === "string"));
  delete process.env.POLINGUAL_LOBBY_AUDIENCE;
});

test("forehead bonus pays the holder once per card", async () => {
  const started = new Date(Date.now() - 21_000).toISOString();
  const tables = setup(room({ status: "done", game: "tiles", playlist: NIGHT, started_at: started }), [seat("h"), seat("p")]);
  const { POST } = await import("../src/app/api/academy/lobbies/bonus/route");
  const ok = await POST(post("bonus", "h", { kind: "forehead", card: 0, got: true }));
  assert.equal(ok.status, 200);
  const holder = (await body(ok)).holder as string;
  assert.equal((await POST(post("bonus", "h", { kind: "forehead", card: 0, got: true }))).status, 409);
  assert.equal(tables.lobby_players.find((x) => x.user_id === holder)?.score, 100);
});

test("audience join reads the age band from the account and ignores the one in the body", async () => {
  process.env.POLINGUAL_LOBBY_AUDIENCE = "on";
  const bands: Record<string, string | null> = { kid: "under13", unknown: null, adult: "18plus" };
  (gate as unknown as Record<string, unknown>).readAgeBand = async (uid: string) => ({ ok: true, band: bands[uid] ?? null });
  const tables = setup(room({ status: "playing", started_at: new Date().toISOString() }), [seat("h"), seat("p")]);
  const { POST } = await import("../src/app/api/academy/lobbies/join/route");
  for (const uid of ["kid", "unknown"]) {
    const r = await POST(join(uid, { code: "ABC234", displayName: "Kid", audience: true, ageBand: "18plus" }));
    assert.equal(r.status, 409);
    assert.equal((await body(r)).error, "audience_age");
  }
  assert.equal((await POST(join("adult", { code: "ABC234", displayName: "Ada", audience: true }))).status, 200);
  assert.deepEqual(tables.lobby_screens.map((r) => [r.user_id, r.role]), [["adult", "audience"]]);
  (gate as unknown as Record<string, unknown>).readAgeBand = async () => ({ ok: false });
  assert.equal((await POST(join("adult2", { code: "ABC234", displayName: "Ada", audience: true }))).status, 503);
  delete process.env.POLINGUAL_LOBBY_AUDIENCE;
});

test("bonus votes are stored once per audience member, screens cannot vote, and the state route reports the tally", async () => {
  process.env.POLINGUAL_LOBBY_AUDIENCE = "on";
  const started = new Date(Date.now() - 15_000).toISOString();
  const tables = setup(room({ status: "playing", game: "same-word", playlist: NIGHT, started_at: started }), [seat("h"), seat("p")]);
  tables.lobby_prompts.push({ lobby_id: ID, round: 1, lang: "es", item_id: "w1", mode: "choice", gloss: "cat", choices: ["es:gato", "es:perro"], answer: "es:gato" });
  tables.lobby_screens.push({ lobby_id: ID, user_id: "v", role: "audience", last_seen: new Date().toISOString() }, { lobby_id: ID, user_id: "tv", role: "screen", last_seen: new Date().toISOString() });
  const { POST } = await import("../src/app/api/academy/lobbies/react/route");
  assert.equal((await POST(post("react", "v", { round: 1, choice: "es:gato" }))).status, 200);
  assert.equal((await POST(post("react", "v", { round: 1, choice: "es:perro" }))).status, 409);
  assert.equal((await POST(post("react", "v", { round: 1, choice: "es:nada" }))).status, 400);
  assert.equal((await POST(post("react", "tv", { round: 1, choice: "es:gato" }))).status, 403);
  assert.equal((await POST(post("react", "p", { round: 1, choice: "es:gato" }))).status, 403);
  assert.deepEqual(tables.lobby_bonus_votes.map((r) => [r.user_id, r.choice]), [["v", "es:gato"]]);
  const { GET } = await import("../src/app/api/academy/lobbies/state/route");
  const lobby = (await body(await GET(state("h")))).lobby as { bonusVotes?: unknown };
  assert.deepEqual(lobby.bonusVotes, [{ round: 1, choices: [{ choice: "es:gato", votes: 1 }], total: 1 }]);
  delete process.env.POLINGUAL_LOBBY_AUDIENCE;
});
