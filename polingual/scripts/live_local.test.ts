import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { verifyEvent } from "../src/lib/stoa/verify";
import { createRoom, hostAction, joinRoom, playerAction, postgrestRpc, roomState, submitAnswer, sweep, type Fetcher, type LiveDeps } from "../src/lib/stoa/live";

const URL_ = process.env.LIVE_LOCAL_URL;
const SERVICE = process.env.LIVE_LOCAL_SERVICE_KEY;
const ANON = process.env.LIVE_LOCAL_ANON_KEY;
const skip = !URL_ || !SERVICE || !ANON || !/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_);

const env = {
  STOA_ROOM_SECRET: randomBytes(48).toString("base64"),
  STOA_SWEEP_SECRET: randomUUID() + randomUUID(),
  POLINGUAL_DB_URL: URL_,
  POLINGUAL_DB_SERVICE_KEY: SERVICE,
  POLINGUAL_DB_ANON_KEY: ANON,
};

const broadcasts: number[] = [];
const send: Fetcher = async (url, init) => {
  const r = await fetch(url, init);
  if (url.endsWith("/realtime/v1/api/broadcast")) broadcasts.push(r.status);
  return r;
};

const deps: LiveDeps = {
  env,
  rpc: postgrestRpc(env, send),
  send,
  build: () =>
    Array.from({ length: 15 }, (_, idx) => ({ idx, round: (Math.floor(idx / 5) + 1) as 1 | 2 | 3, kind: "pick_word" as const, prompt: { en: `w${idx}`, lang: "es" }, options: ["a", "b", "c", "d"], answer: 0 })),
};

function listen(realtime: { url: string; key: string; topic: string }): Promise<{ events: unknown[]; close: () => void }> {
  const ws = new WebSocket(`${realtime.url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${realtime.key}&vsn=1.0.0`);
  const events: unknown[] = [];
  return new Promise((resolve, reject) => {
    ws.onerror = () => reject(new Error("realtime socket failed"));
    ws.onopen = () => ws.send(JSON.stringify({ topic: `realtime:${realtime.topic}`, event: "phx_join", payload: { config: { broadcast: { self: false }, private: false } }, ref: "1" }));
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data)) as { event: string; ref?: string; payload: { status?: string; payload?: unknown } };
      if (msg.event === "phx_reply" && msg.ref === "1") {
        if (msg.payload.status === "ok") resolve({ events, close: () => ws.close() });
        else reject(new Error(JSON.stringify(msg.payload)));
      }
      if (msg.event === "broadcast") events.push(msg.payload.payload);
    };
  });
}

async function session(): Promise<string> {
  const email = `stoa-${randomUUID()}@bucket.test`;
  const password = randomUUID();
  const admin = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE!, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  assert.equal(admin.status, 200, "local auth creates a host");
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return ((await r.json()) as { access_token: string }).access_token;
}

test("a full room runs on the local stack", { skip }, async () => {
  const room = await createRoom(`Bearer ${await session()}`, { settings: { targets: ["es"] } }, deps);
  assert.equal(room.status, 200, JSON.stringify(room.body));
  const rid = String(room.body.room_id);
  const hostAuth = `Bearer ${room.body.host_token}`;

  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  for (const nick of ["brave-otter", "quiet-lamp", "swift-heron"]) {
    const j = await joinRoom({ code: room.body.code, nickname: nick }, "127.0.0.1", deps);
    assert.equal(j.status, 200, JSON.stringify(j.body));
    tokens[nick] = `Bearer ${j.body.token}`;
    ids[nick] = String(j.body.player_id);
  }
  assert.equal((await joinRoom({ code: room.body.code, nickname: "brave-otter" }, "127.0.0.1", deps)).status, 409);

  const phone = await listen(room.body.realtime as { url: string; key: string; topic: string });
  const lobby = await roomState(rid, hostAuth, deps);
  assert.equal((lobby.body.roster as unknown[]).length, 3);
  assert.equal((await hostAction(rid, "start", hostAuth, deps)).status, 200);

  for (let i = 0; i < 40 && !phone.events.length; i++) await new Promise((r) => setTimeout(r, 50));
  phone.close();
  const opened = phone.events.find((e) => (e as { type: string }).type === "open");
  assert.ok(opened, "a client on the anon key receives the open event");
  const v = await verifyEvent(opened, { roomId: rid, lastSeq: 0, publicKey: String(room.body.verify_key), now: Date.now(), clockOffsetMs: 0 });
  assert.equal(v.ok, true, "the open event verifies");

  const q = await roomState(rid, tokens["brave-otter"], deps);
  assert.equal((q.body.room as { phase: string }).phase, "question");
  assert.equal((q.body.question as { answer: unknown }).answer, null);

  for (const nick of Object.keys(tokens)) {
    const a = await submitAnswer(tokens[nick], { idx: 0, choice: nick === "swift-heron" ? 2 : 0 }, deps);
    assert.equal(a.status, 200, JSON.stringify(a.body));
  }
  assert.equal((await submitAnswer(tokens["brave-otter"], { idx: 0, choice: 1 }, deps)).status, 409);

  const after = await roomState(rid, tokens["brave-otter"], deps);
  assert.equal((after.body.room as { phase: string }).phase, "reveal");
  assert.equal((after.body.question as { answer: number }).answer, 0);
  assert.ok((after.body.player as { points: number }).points > 900, "a fast right answer scores over 900");

  assert.equal((await playerAction(rid, ids["swift-heron"], "remove", hostAuth, {}, deps)).status, 200);
  assert.equal((await roomState(rid, tokens["swift-heron"], deps)).status, 403);
  const kept = await roomState(rid, tokens["quiet-lamp"], deps);
  assert.equal(kept.status, 200);
  assert.equal(kept.body.token, undefined, "removing one player leaves other tokens valid");
  assert.equal((await hostAction(rid, "skip", hostAuth, deps)).status, 200);
  assert.equal((await submitAnswer(tokens["quiet-lamp"], { idx: 1, choice: 0 }, deps)).status, 200);
  assert.equal((await submitAnswer(tokens["swift-heron"], { idx: 1, choice: 0 }, deps)).status, 403);

  assert.equal((await sweep(`Bearer ${env.STOA_SWEEP_SECRET}`, deps)).status, 200);
  assert.equal((await hostAction(rid, "end", hostAuth, deps)).status, 200);
  assert.equal((await joinRoom({ code: room.body.code, nickname: "eager-owl" }, "127.0.0.1", deps)).status, 404);
  assert.ok(broadcasts.length >= 4 && broadcasts.every((s) => s === 202), `broadcasts: ${broadcasts.join(",")}`);
});

test("40 players answer at once and every answer is scored", { skip }, async () => {
  const room = await createRoom(`Bearer ${await session()}`, { settings: { targets: ["es"] } }, deps);
  assert.equal(room.status, 200, JSON.stringify(room.body));
  const rid = String(room.body.room_id);
  const hostAuth = `Bearer ${room.body.host_token}`;
  const adj = ["amber", "brave", "bright", "calm", "clever", "cozy", "eager", "gentle"];
  const noun = ["badger", "comet", "falcon", "fern", "heron"];
  const nicks = adj.flatMap((a) => noun.map((n) => `${a}-${n}`));
  const tokens = await Promise.all(nicks.map(async (nickname) => `Bearer ${(await joinRoom({ code: room.body.code, nickname }, "10.0.0.1", deps)).body.token}`));
  assert.equal((await hostAction(rid, "lock", hostAuth, deps)).status, 200);
  assert.equal((await joinRoom({ code: room.body.code, nickname: "witty-zebra" }, "10.0.0.1", deps)).status, 409);
  assert.equal((await hostAction(rid, "start", hostAuth, deps)).status, 200);
  const results = await Promise.all(tokens.map((t) => submitAnswer(t, { idx: 0, choice: 0 }, deps)));
  assert.deepEqual(results.map((r) => r.status).filter((s) => s !== 200), []);
  const host = await roomState(rid, hostAuth, deps);
  assert.equal((host.body.room as { phase: string }).phase, "reveal", "the last of 40 answers reveals the question");
  const standings = host.body.standings as { points: number }[];
  assert.equal(standings.length, 10);
  assert.ok(standings.every((s) => s.points >= 500), "every concurrent answer was scored");
  assert.equal((await hostAction(rid, "kick_all", hostAuth, deps)).status, 200);
  assert.equal((await roomState(rid, tokens[0], deps)).status, 403);
  assert.equal((await hostAction(rid, "end", hostAuth, deps)).status, 200);
});

test("a Chorus room balances teams, lets the host move a player, and scores teams by their mean", { skip }, async () => {
  const room = await createRoom(`Bearer ${await session()}`, { settings: { targets: ["es"] }, mode: "chorus", teams: 2 }, deps);
  assert.equal(room.status, 200, JSON.stringify(room.body));
  const rid = String(room.body.room_id);
  const hostAuth = `Bearer ${room.body.host_token}`;
  const joined = [];
  for (const nickname of ["amber-otter", "brave-owl", "calm-fern", "eager-lamp", "gentle-river"]) {
    const j = await joinRoom({ code: room.body.code, nickname }, "10.1.0.1", deps);
    assert.equal(j.status, 200, JSON.stringify(j.body));
    joined.push({ id: String(j.body.player_id), token: `Bearer ${j.body.token}` });
  }
  let host = await roomState(rid, hostAuth, deps);
  const roster = host.body.roster as { id: string; team_slot: number }[];
  assert.deepEqual(roster.map((p) => p.team_slot), [0, 1, 0, 1, 0], "players alternate teams on join");
  assert.equal((await playerAction(rid, joined[4].id, "move", hostAuth, { team: 1 }, deps)).status, 200);
  assert.equal((await playerAction(rid, joined[4].id, "move", hostAuth, { team: 2 }, deps)).status, 400, "a two-team room has no third team");
  assert.equal((await hostAction(rid, "start", hostAuth, deps)).status, 200);
  for (const [i, p] of joined.entries()) assert.equal((await submitAnswer(p.token, { idx: 0, choice: i < 2 ? 0 : 3 }, deps)).status, 200);
  host = await roomState(rid, hostAuth, deps);
  assert.equal((host.body.room as { phase: string; mode: string }).mode, "chorus");
  const teams = host.body.team_standings as { team: number; points: number; members: number }[];
  assert.deepEqual(teams.map((t) => t.members).sort(), [2, 3]);
  assert.equal(teams.length, 2);
  const phone = await roomState(rid, joined[0].token, deps);
  assert.equal((phone.body.player as { team_slot: number }).team_slot, 0);
  assert.equal((await hostAction(rid, "end", hostAuth, deps)).status, 200);
});
