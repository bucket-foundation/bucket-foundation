import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { verifyEvent } from "../src/lib/stoa/verify";
import { createRoom, hostAction, joinRoom, playerAction, postgrestRpc, roomState, submitAnswer, sweep, type Fetcher, type LiveDeps } from "../src/lib/stoa/live";

const URL_ = process.env.LIVE_LOCAL_URL;
const SERVICE = process.env.LIVE_LOCAL_SERVICE_KEY;
const ANON = process.env.LIVE_LOCAL_ANON_KEY;
const skip = !URL_ || !SERVICE || !ANON || !/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_);

const env = {
  STOA_ROOM_SECRET: randomUUID() + randomUUID(),
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
    [0, 1].map((idx) => ({ idx, round: 1 as const, kind: "pick_word" as const, prompt: { en: `w${idx}`, lang: "es" }, options: ["a", "b", "c", "d"], answer: 0 })),
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
  const fresh = await roomState(rid, tokens["quiet-lamp"], deps);
  assert.ok(fresh.body.token, "a remaining player gets a new token");
  assert.equal((await hostAction(rid, "skip", hostAuth, deps)).status, 200);
  assert.equal((await submitAnswer(tokens["quiet-lamp"], { idx: 1, choice: 0 }, deps)).body.error, "stale_token");
  assert.equal((await submitAnswer(`Bearer ${fresh.body.token}`, { idx: 1, choice: 0 }, deps)).status, 200);

  assert.equal((await sweep(`Bearer ${env.STOA_SWEEP_SECRET}`, deps)).status, 200);
  assert.equal((await hostAction(rid, "end", hostAuth, deps)).status, 200);
  assert.equal((await joinRoom({ code: room.body.code, nickname: "eager-owl" }, "127.0.0.1", deps)).status, 404);
  assert.ok(broadcasts.length >= 4 && broadcasts.every((s) => s === 202), `broadcasts: ${broadcasts.join(",")}`);
});
