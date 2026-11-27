import "./lobby-test-env";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import * as groups from "../src/lib/academy/groups-server";
import * as gate from "../src/lib/research-os/learn-gate";
import { accountRefusal, recordRefusal, teachAllowed, teachChoices, teachClip, teachScores, teachView, type TeachRow } from "../src/lib/academy/lobby-teach";
import { fakeDb } from "./lobby-fake-db";

const CLIP = `data:audio/webm;codecs=opus;base64,${"A".repeat(400)}`;
const adult = { band: "adult" as const, speaks: [{ lang: "es", level: 4 as const, reads: true }], learn: [], surprise: false };

test("only an approved adult home-language speaker may record", () => {
  assert.equal(recordRefusal(null, "es", "approved"), "no_card");
  assert.equal(recordRefusal({ ...adult, band: "under13" }, "es", "approved"), "not_adult");
  assert.equal(recordRefusal({ ...adult, band: "teen" }, "es", "approved"), "not_adult");
  assert.equal(recordRefusal(adult, "fr", "approved"), "not_home_language");
  assert.equal(recordRefusal({ ...adult, speaks: [{ lang: "es", level: 3 }] }, "es", "approved"), "not_home_language");
  assert.equal(recordRefusal(adult, "es", "asked"), "not_approved");
  assert.equal(recordRefusal(adult, "es", "approved"), null);
});

function ages(bands: Record<string, string | null>) {
  (gate as unknown as Record<string, unknown>).readAgeBand = async (uid: string) => ({ ok: true, band: bands[uid] ?? null });
}

test("guests record on host approval alone; signed-in speakers also need an 18 and over account", () => {
  assert.equal(accountRefusal(true, null), null);
  assert.equal(accountRefusal(false, { ok: true, band: "18plus" }), null);
  assert.equal(accountRefusal(false, { ok: true, band: "13to17" }), "not_adult_account");
  assert.equal(accountRefusal(false, { ok: true, band: null }), "not_adult_account");
  assert.equal(accountRefusal(false, { ok: false }), "age_unavailable");
});

test("clips and choices are checked before storage", () => {
  assert.equal(teachClip(CLIP), CLIP);
  assert.equal(teachClip("data:image/png;base64," + "A".repeat(400)), null);
  assert.equal(teachClip("data:audio/webm;base64,AAAA"), null);
  assert.equal(teachClip(`data:audio/webm;base64,${"A".repeat(300_000)}`), null);
  assert.deepEqual(teachChoices([" dog ", "cat"], 0), { choices: ["dog", "cat"], answer: 0 });
  assert.equal(teachChoices(["dog", "Dog"], 0), null);
  assert.equal(teachChoices(["dog"], 0), null);
  assert.equal(teachChoices(["dog", "cat"], 2), null);
});

test("the host runs the round, the speaker records, everyone else guesses", () => {
  assert.ok(teachAllowed("ask", "none", "h", "h", "s"));
  assert.ok(!teachAllowed("ask", "none", "p", "h", "s"));
  assert.ok(teachAllowed("approve", "asked", "h", "h", "s"));
  assert.ok(!teachAllowed("record", "asked", "s", "h", "s"));
  assert.ok(teachAllowed("record", "approved", "s", "h", "s"));
  assert.ok(!teachAllowed("record", "approved", "p", "h", "s"));
  assert.ok(teachAllowed("guess", "open", "p", "h", "s"));
  assert.ok(!teachAllowed("guess", "open", "s", "h", "s"));
  assert.ok(teachAllowed("skip", "open", "h", "h", "s"));
  assert.ok(teachAllowed("report", "ready", "h", "h", "s"));
  assert.ok(!teachAllowed("report", "ready", "p", "h", "s"));
});

test("teacher award needs one right guess and pays one per round", () => {
  assert.deepEqual(teachScores({ answer: 1, speaker_id: "s", guesses: { a: 1, b: 0, s: 1 } }), { points: { a: 100, b: 0 }, teacherAward: true });
  assert.equal(teachScores({ answer: 1, speaker_id: "s", guesses: { a: 0 } }).teacherAward, false);
});

test("guessers never see the clip or answer, the shared screen hears it only once open", () => {
  const row: TeachRow = { lobby_id: "L", round: 0, speaker_id: "s", status: "open", lang: "es", choices: ["dog", "cat"], answer: 0, clip: CLIP, guesses: {}, created_at: new Date().toISOString() };
  assert.equal(teachView(row, "p", "h", ["tv"]).clip, null);
  assert.equal(teachView(row, "p", "h", ["tv"]).answer, null);
  assert.equal(teachView(row, "tv", "h", ["tv"]).clip, CLIP);
  assert.equal(teachView({ ...row, status: "ready" }, "tv", "h", ["tv"]).clip, null);
  assert.deepEqual(teachView({ ...row, status: "ready" }, "p", "h", []).choices, []);
});

const LOBBY = "00000000-0000-4000-8000-0000000000a1";

function req(uid: string, body?: Record<string, unknown>) {
  const url = `http://x/api/academy/lobby-teach${body ? "" : `?lobby=${LOBBY}`}`;
  return new NextRequest(url, { method: body ? "POST" : "GET", headers: { "x-test-user": uid, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}

test("route: a full Family Teach round scores guessers, awards the teacher and drops the clip", async () => {
  const now = new Date().toISOString();
  const { db, tables } = fakeDb(
    {
      lobbies: [{ id: LOBBY, host_id: "h" }],
      lobby_players: [{ lobby_id: LOBBY, user_id: "h", score: 0 }, { lobby_id: LOBBY, user_id: "s", score: 0 }, { lobby_id: LOBBY, user_id: "p", score: 0 }, { lobby_id: LOBBY, user_id: "k", score: 0 }],
      lobby_screens: [],
      lobby_cards: [{ lobby_id: LOBBY, user_id: "s", card: adult, created_at: now }],
      lobby_teach: [],
    },
    { lobby_teach: ["lobby_id", "round"], lobby_teach_guesses: ["lobby_id", "round", "user_id"] },
  );
  const g = groups as unknown as Record<string, unknown>;
  g.service = () => db;
  g.requestUser = async (r: NextRequest) => r.headers.get("x-test-user");
  ages({ s: "18plus" });
  const route = await import("../src/app/api/academy/lobby-teach/route");
  const post = async (uid: string, body: Record<string, unknown>) => {
    const r = await route.POST(req(uid, { lobbyId: LOBBY, ...body }));
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  };
  assert.equal((await post("p", { action: "ask", speakerId: "s" })).status, 403);
  assert.equal((await post("h", { action: "ask", speakerId: "s", lang: "es" })).status, 200);
  assert.equal((await post("s", { action: "record", clip: CLIP, choices: ["dog", "cat"], answer: 0 })).body.error, "not_allowed");
  assert.equal((await post("h", { action: "approve" })).status, 200);
  assert.equal((await post("k", { action: "record", clip: CLIP, choices: ["dog", "cat"], answer: 0 })).status, 403);
  assert.equal((await post("s", { action: "record", clip: CLIP, choices: ["dog", "cat"], answer: 0 })).status, 200);
  assert.equal((await post("h", { action: "play" })).status, 200);
  const both = await Promise.all([post("p", { action: "guess", guess: 0 }), post("k", { action: "guess", guess: 1 })]);
  assert.deepEqual(both.map((x) => x.status), [200, 200]);
  assert.equal(tables.lobby_teach_guesses.length, 2);
  assert.equal((await post("p", { action: "guess", guess: 1 })).status, 409);
  const view = (await (await route.GET(req("p"))).json()) as { teach: { clip: unknown; answer: unknown } };
  assert.equal(view.teach.clip, null);
  const [done, again] = await Promise.all([post("h", { action: "reveal" }), post("h", { action: "reveal" })]);
  assert.equal([done, again].filter((x) => x.status === 200).length, 1);
  assert.equal((done.status === 200 ? done : again).body.teacherAward, true);
  assert.deepEqual(tables.lobby_players.map((r) => r.score), [0, 0, 100, 0]);
  assert.equal(tables.lobby_teach[0].clip, null);
});

test("route: an under-13 seat with no stored card cannot record, and the host can report a clip", async () => {
  const now = new Date().toISOString();
  const { db, tables } = fakeDb(
    {
      lobbies: [{ id: LOBBY, host_id: "h" }],
      lobby_players: [{ lobby_id: LOBBY, user_id: "h", score: 0 }, { lobby_id: LOBBY, user_id: "kid", score: 0 }, { lobby_id: LOBBY, user_id: "s", score: 0 }],
      lobby_screens: [],
      lobby_cards: [{ lobby_id: LOBBY, user_id: "s", card: adult, created_at: now }],
      lobby_teach: [],
    },
    { lobby_teach: ["lobby_id", "round"], lobby_teach_guesses: ["lobby_id", "round", "user_id"] },
  );
  const g = groups as unknown as Record<string, unknown>;
  g.service = () => db;
  g.requestUser = async (r: NextRequest) => r.headers.get("x-test-user");
  ages({ s: "18plus" });
  const route = await import("../src/app/api/academy/lobby-teach/route");
  const post = async (uid: string, body: Record<string, unknown>) => (await route.POST(req(uid, { lobbyId: LOBBY, ...body }))).json() as Promise<Record<string, unknown>>;
  await post("h", { action: "ask", speakerId: "kid", lang: "es" });
  await post("h", { action: "approve" });
  assert.equal((await post("kid", { action: "record", clip: CLIP, choices: ["dog", "cat"], answer: 0 })).error, "no_card");
  await post("h", { action: "skip" });
  await post("h", { action: "ask", speakerId: "s", lang: "es" });
  await post("h", { action: "approve" });
  await post("s", { action: "record", clip: CLIP, choices: ["dog", "cat"], answer: 0 });
  assert.equal((await post("h", { action: "report" })).ok, true);
  const last = tables.lobby_teach.find((r) => r.round === 1);
  assert.equal(last?.status, "reported");
  assert.equal(last?.clip, null);
});

test("route: teach rows older than 24 hours are purged", async () => {
  const old = new Date(Date.now() - 25 * 3600_000).toISOString();
  const { db, tables } = fakeDb({ lobbies: [{ id: LOBBY, host_id: "h" }], lobby_players: [{ lobby_id: LOBBY, user_id: "h" }], lobby_screens: [], lobby_teach: [{ lobby_id: LOBBY, round: 0, speaker_id: "s", status: "ready", clip: CLIP, guesses: {}, choices: [], created_at: old }] });
  const g = groups as unknown as Record<string, unknown>;
  g.service = () => db;
  g.requestUser = async (r: NextRequest) => r.headers.get("x-test-user");
  ages({ s: "18plus" });
  const route = await import("../src/app/api/academy/lobby-teach/route");
  const res = (await (await route.GET(req("h"))).json()) as { teach: unknown };
  assert.equal(res.teach, null);
  assert.equal(tables.lobby_teach.length, 0);
});

test("route: a signed-in speaker whose account is under 18 cannot record even after host approval", async () => {
  const now = new Date().toISOString();
  const { db } = fakeDb(
    { lobbies: [{ id: LOBBY, host_id: "h" }], lobby_players: [{ lobby_id: LOBBY, user_id: "h", score: 0 }, { lobby_id: LOBBY, user_id: "s", score: 0 }], lobby_screens: [], lobby_cards: [{ lobby_id: LOBBY, user_id: "s", card: adult, created_at: now }], lobby_teach: [] },
    { lobby_teach: ["lobby_id", "round"], lobby_teach_guesses: ["lobby_id", "round", "user_id"] },
  );
  const g = groups as unknown as Record<string, unknown>;
  g.service = () => db;
  g.requestUser = async (r: NextRequest) => r.headers.get("x-test-user");
  ages({ s: "13to17" });
  const route = await import("../src/app/api/academy/lobby-teach/route");
  const post = async (uid: string, body: Record<string, unknown>) => (await route.POST(req(uid, { lobbyId: LOBBY, ...body }))).json() as Promise<Record<string, unknown>>;
  await post("h", { action: "ask", speakerId: "s", lang: "es" });
  await post("h", { action: "approve" });
  assert.equal((await post("s", { action: "record", clip: CLIP, choices: ["dog", "cat"], answer: 0 })).error, "not_adult_account");
});
