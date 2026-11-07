import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { SignedEvent } from "../src/lib/stoa/event";
import { buildRoomSet } from "../src/lib/stoa/generators";
import { createRoom, hostAction, joinRoom, postgrestRpc, roomState, submitAnswer, submitProbe, sweep, type Fetcher, type LiveDeps } from "../src/lib/stoa/live";
import { ADJECTIVES, NOUNS } from "../src/lib/stoa/nicknames";
import { verifyEvent, type VerifyReason } from "../src/lib/stoa/verify";

const URL_ = process.env.LIVE_LOCAL_URL ?? "";
const SERVICE = process.env.LIVE_LOCAL_SERVICE_KEY ?? "";
const ANON = process.env.LIVE_LOCAL_ANON_KEY ?? "";
const PLAYERS = Number(process.env.LOAD_PLAYERS ?? 100);
const SWEEP_MS = 10_000;
const HOST_POLL_MS = 1_000;
const PHONE_POLL_MS = 10_000;
const REPORT_GAP_MS = 15_000;

if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_) || !SERVICE || !ANON) {
  console.error("live_load runs against the local stack only");
  process.exit(2);
}

const env = {
  STOA_ROOM_SECRET: randomBytes(48).toString("base64"),
  STOA_SWEEP_SECRET: randomUUID() + randomUUID(),
  POLINGUAL_DB_URL: URL_,
  POLINGUAL_DB_SERVICE_KEY: SERVICE,
  POLINGUAL_DB_ANON_KEY: ANON,
};

type Realtime = { url: string; key: string; topic: string };
const t0 = performance.now();
const at = () => performance.now() - t0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const rpcMs: Record<string, number[]> = {};
const sentBroadcasts: { at: number; topics: number; status: number }[] = [];
const dbErrors: string[] = [];
const signedByServer = new Set<string>();

const send: Fetcher = async (url, init) => {
  if (!url.endsWith("/realtime/v1/api/broadcast")) {
    const r = await fetch(url, init).catch((e: Error) => {
      dbErrors.push(`${url.split("/").pop()}: ${e.message}`);
      throw e;
    });
    if (!r.ok && r.status >= 500) dbErrors.push(`${url.split("/").pop()}: ${r.status} ${(await r.clone().text()).slice(0, 160)}`);
    return r;
  }
  const body = JSON.parse(String(init.body)) as { messages: { payload: SignedEvent }[] };
  for (const m of body.messages) signedByServer.add(m.payload.sig);
  const r = await fetch(url, init);
  sentBroadcasts.push({ at: at(), topics: body.messages.length, status: r.status });
  return r;
};

const baseRpc = postgrestRpc(env, send);
const deps: LiveDeps = {
  env,
  send,
  build: buildRoomSet,
  rpc: async (fn, args) => {
    const s = performance.now();
    const r = await baseRpc(fn, args);
    (rpcMs[fn] ??= []).push(performance.now() - s);
    return r;
  },
};

function pct(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] * 10) / 10;
}

function socketUrl(rt: Realtime): string {
  return `${rt.url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${rt.key}&vsn=1.0.0`;
}

let socketFailures = 0;

class Channel {
  ws: WebSocket | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private ref = 0;
  constructor(public rt: Realtime, private onBroadcast: (payload: unknown) => void) {}

  async open(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.connect();
      } catch (e) {
        socketFailures++;
        this.close();
        if (attempt >= 6) throw e;
        await sleep(Math.min(10_000, 500 * 2 ** attempt));
      }
    }
  }

  private connect(): Promise<void> {
    const ws = new WebSocket(socketUrl(this.rt));
    this.ws = ws;
    const topic = this.rt.topic;
    return new Promise((resolve, reject) => {
      const fail = setTimeout(() => reject(new Error(`join timed out on ${topic}`)), 10_000);
      ws.onerror = () => reject(new Error("realtime socket failed"));
      ws.onopen = () => {
        ws.send(JSON.stringify({ topic: `realtime:${topic}`, event: "phx_join", payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, private: false } }, ref: String(++this.ref) }));
        this.beat = setInterval(() => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++this.ref) })), 25_000);
      };
      ws.onmessage = (m) => {
        const msg = JSON.parse(String(m.data)) as { event: string; ref?: string; payload: { status?: string; event?: string; payload?: unknown } };
        if (msg.event === "phx_reply" && msg.ref === "1") {
          clearTimeout(fail);
          if (msg.payload.status === "ok") resolve();
          else reject(new Error(JSON.stringify(msg.payload)));
        }
        if (msg.event === "broadcast" && msg.payload.event === "stoa") this.onBroadcast(msg.payload.payload);
      };
    });
  }

  push(payload: unknown): void {
    this.ws?.send(JSON.stringify({ topic: `realtime:${this.rt.topic}`, event: "broadcast", payload: { type: "broadcast", event: "stoa", payload }, ref: String(++this.ref) }));
  }

  close(): void {
    if (this.beat) clearInterval(this.beat);
    this.ws?.close();
  }
}

const received: number[] = [];
const accepted: number[] = [];
const rejected: Record<VerifyReason, number> = { shape: 0, room: 0, seq: 0, stale: 0, signature: 0 };
const acceptedForeign: string[] = [];
const answerMs: number[] = [];
const answerStatus: Record<string, number> = {};
const stateCalls: number[] = [];
let reportsSent = 0;
let rotatesSeen = 0;

class Phone {
  token = "";
  roomId = "";
  playerId = "";
  verifyKey = "";
  seq = 0;
  offset = 0;
  samples: { sent_at: number; received_at: number }[] = [];
  lastFail = 0;
  answered = new Set<number>();
  channel: Channel | null = null;
  seqs: number[] = [];
  captured: unknown[] = [];
  stopped = false;

  constructor(public nickname: string, private capture = false) {}

  async join(code: string, ip: string): Promise<void> {
    const r = await joinRoom({ code, nickname: this.nickname }, ip, deps);
    assert.equal(r.status, 200, `${this.nickname} joins: ${JSON.stringify(r.body)}`);
    this.token = `Bearer ${r.body.token}`;
    this.roomId = String(r.body.room_id);
    this.playerId = String(r.body.player_id);
    this.verifyKey = String(r.body.verify_key);
  }

  async state(): Promise<void> {
    if (this.stopped) return;
    const sent = Date.now();
    stateCalls.push(at());
    const r = await roomState(this.roomId, this.token, deps);
    if (r.status !== 200) return;
    const b = r.body as { server_now: number; room: { seq: number }; realtime: Realtime; token?: string };
    this.offset = Math.round(b.server_now - (sent + Date.now()) / 2);
    if (b.token) this.token = `Bearer ${b.token}`;
    this.seq = Math.max(this.seq, b.room.seq);
    if (!this.channel || this.channel.rt.topic !== b.realtime.topic) {
      this.channel?.close();
      this.channel = new Channel(b.realtime, (p) => void this.onEvent(p));
      await this.channel.open();
    }
  }

  async onEvent(payload: unknown): Promise<void> {
    if (this.stopped) return;
    received.push(at());
    if (this.capture) this.captured.push(payload);
    const v = await verifyEvent(payload, { roomId: this.roomId, lastSeq: this.seq, publicKey: this.verifyKey, now: Date.now(), clockOffsetMs: this.offset });
    if (!v.ok) {
      rejected[v.reason]++;
      if (v.reason !== "seq" && Date.now() - this.lastFail > REPORT_GAP_MS) {
        this.lastFail = Date.now();
        reportsSent++;
        await submitProbe(this.token, { failed: true }, deps);
      }
      return;
    }
    const sig = (payload as SignedEvent).sig;
    if (!signedByServer.has(sig)) acceptedForeign.push(sig);
    accepted.push(at());
    this.seq = v.seq;
    this.seqs.push(v.seq);
    if (v.type === "probe") {
      this.samples.push({ sent_at: v.issuedAt, received_at: Date.now() + this.offset });
      if (this.samples.length === 3) await submitProbe(this.token, { samples: this.samples }, deps);
      return;
    }
    if (v.type === "rotate") rotatesSeen++;
    if (v.type === "open") {
      const idx = (v.payload as { idx: number }).idx;
      setTimeout(() => void this.answer(idx), 400 + Math.random() * 5600);
      return;
    }
    setTimeout(() => void this.state(), v.type === "rotate" || v.type === "reveal" ? 0 : Math.floor(Math.random() * 800));
  }

  async answer(idx: number): Promise<void> {
    if (this.stopped || this.answered.has(idx)) return;
    this.answered.add(idx);
    const s = performance.now();
    const r = await submitAnswer(this.token, { idx, choice: Math.floor(Math.random() * 4) }, deps);
    answerMs.push(performance.now() - s);
    const key = r.status === 200 ? "200" : `${r.status} ${(r.body as { error?: string }).error}`;
    answerStatus[key] = (answerStatus[key] ?? 0) + 1;
  }

  stop(): void {
    this.stopped = true;
    this.channel?.close();
  }
}

async function hostSession(): Promise<string> {
  const email = `stoa-load-${randomUUID()}@bucket.test`;
  const password = randomUUID();
  const admin = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  assert.equal(admin.status, 200, "local auth creates a host");
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return `Bearer ${((await r.json()) as { access_token: string }).access_token}`;
}

function nicknames(n: number, skip = 0): string[] {
  const all = ADJECTIVES.flatMap((a) => NOUNS.map((x) => `${a}-${x}`));
  return all.slice(skip, skip + n);
}

type HostSnap = { room: { phase: string; idx: number; paused: boolean; seq: number }; answered?: number };

async function hostState(rid: string, auth: string): Promise<HostSnap> {
  stateCalls.push(at());
  const r = await roomState(rid, auth, deps);
  assert.equal(r.status, 200, `host state: ${JSON.stringify(r.body)}`);
  return r.body as HostSnap;
}

async function waitFor(rid: string, auth: string, ok: (s: HostSnap) => boolean, ms: number, what: string): Promise<HostSnap> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await hostState(rid, auth);
    if (ok(s)) return s;
    await sleep(HOST_POLL_MS);
  }
  throw new Error(`timed out waiting for ${what}`);
}

function perSecond(times: number[]): { mean: number; peak: number } {
  if (!times.length) return { mean: 0, peak: 0 };
  const buckets = new Map<number, number>();
  for (const t of times) buckets.set(Math.floor(t / 1000), (buckets.get(Math.floor(t / 1000)) ?? 0) + 1);
  const span = Math.max(1, Math.floor(times[times.length - 1] / 1000) - Math.floor(times[0] / 1000) + 1);
  return { mean: Math.round((times.length / span) * 10) / 10, peak: Math.max(...buckets.values()) };
}

async function main(): Promise<void> {
  const host = await hostSession();
  const room = await createRoom(host, { settings: { targets: ["es", "fr", "de", "it"] } }, deps);
  assert.equal(room.status, 200, JSON.stringify(room.body));
  const rid = String(room.body.room_id);
  const hostAuth = `Bearer ${room.body.host_token}`;

  const other = await createRoom(await hostSession(), { settings: { targets: ["es"] } }, deps);
  assert.equal(other.status, 200, JSON.stringify(other.body));
  const spy = new Phone("witty-zebra", true);
  await spy.join(String(other.body.code), "10.9.0.1");
  await spy.state();

  const phones = nicknames(PLAYERS).map((n, i) => new Phone(n, i === 0));
  const joinStart = performance.now();
  await Promise.all(phones.map((p, i) => p.join(String(room.body.code), `10.0.${Math.floor(i / 35)}.1`)));
  const joinMs = performance.now() - joinStart;
  await Promise.all(phones.map((p) => p.state()));
  const attacker = phones[0];

  let hostDown = false;
  let lastHost: HostSnap | null = null;
  const hostLoop = (async () => {
    while (lastHost?.room.phase !== "closed") {
      if (!hostDown) lastHost = await hostState(rid, hostAuth);
      await sleep(HOST_POLL_MS);
    }
  })();
  const sweeps = setInterval(() => void sweep(`Bearer ${env.STOA_SWEEP_SECRET}`, deps), SWEEP_MS);
  const polls = [...phones, spy].map((p) => setInterval(() => void p.state(), PHONE_POLL_MS + Math.random() * 1000));

  await sleep(16_000);
  assert.equal((await hostAction(rid, "start", hostAuth, deps)).status, 200);
  const gameStart = at();

  await waitFor(rid, hostAuth, (s) => s.room.phase === "question" && s.room.idx === 1, 60_000, "question 2");
  const topicBefore = attacker.channel!.rt.topic;
  const forgedAt = at();
  for (let i = 0; i < 5; i++) {
    attacker.channel!.push({ room_id: rid, seq: 1_000_000 + i, type: "reveal", issued_at: Date.now(), body: JSON.stringify({ idx: 1, answer: 0 }), sig: randomBytes(64).toString("base64url") });
    await sleep(200);
  }
  await sleep(3000);
  const rotated = attacker.channel!.rt.topic !== topicBefore;

  await waitFor(rid, hostAuth, (s) => s.room.phase === "question" && s.room.idx === 5, 120_000, "round 2");
  hostDown = true;
  const dropAt = at();
  const dropIdx = lastHost!.room.idx;
  for (const old of attacker.captured.slice(-5)) attacker.channel!.push(old);
  for (const foreign of spy.captured.slice(-3)) attacker.channel!.push(foreign);
  await sleep(30_000);

  const back = await hostState(rid, hostAuth);
  const resumedAt = at();
  const advancedWhileDown = back.room.idx > dropIdx || back.room.phase !== "question";
  hostDown = false;
  const pause = await hostAction(rid, "pause", hostAuth, deps);
  const resume = await hostAction(rid, "resume", hostAuth, deps);

  await waitFor(rid, hostAuth, (s) => s.room.phase === "finale", 300_000, "finale");
  const gameEnd = at();
  const final = await roomState(rid, hostAuth, deps);
  assert.equal((await hostAction(rid, "end", hostAuth, deps)).status, 200);
  await hostAction(String(other.body.room_id), "end", `Bearer ${other.body.host_token}`, deps);
  clearInterval(sweeps);
  polls.forEach(clearInterval);
  await sleep(1500);
  phones.forEach((p) => p.stop());
  spy.stop();
  await hostLoop.catch(() => undefined);

  const monotonic = phones.every((p) => p.seqs.every((s, i) => i === 0 || s > p.seqs[i - 1]));
  const gameSecs = (gameEnd - gameStart) / 1000;
  const report = {
    players: PLAYERS,
    game_seconds: Math.round(gameSecs),
    join_all_ms: Math.round(joinMs),
    answer_ms: { n: answerMs.length, p50: pct(answerMs, 50), p95: pct(answerMs, 95), p99: pct(answerMs, 99), max: pct(answerMs, 100) },
    rpc_ms: Object.fromEntries(Object.entries(rpcMs).map(([k, v]) => [k, { n: v.length, p50: pct(v, 50), p95: pct(v, 95) }])),
    answer_status: answerStatus,
    db_errors: dbErrors,
    realtime: {
      server_broadcasts: sentBroadcasts.length,
      server_broadcasts_per_s: perSecond(sentBroadcasts.map((b) => b.at)),
      broadcast_status: [...new Set(sentBroadcasts.map((b) => b.status))],
      delivered: received.length,
      delivered_per_s: perSecond(received),
      delivered_per_question: Math.round(received.length / 15),
      accepted: accepted.length,
    },
    state_calls: { n: stateCalls.length, per_s: perSecond(stateCalls) },
    attack: {
      forged_sent: 5,
      replays_sent: Math.min(5, attacker.captured.length) + Math.min(3, spy.captured.length),
      rejected,
      reports_sent: reportsSent,
      rotated_after_forgery: rotated,
      rotate_events_accepted: rotatesSeen,
      forged_accepted: acceptedForeign.length,
      seq_monotonic: monotonic,
      socket_retries: socketFailures,
    },
    host_drop: { at_s: Math.round(dropAt / 1000), idx_at_drop: dropIdx, idx_on_return: back.room.idx, phase_on_return: back.room.phase, advanced: advancedWhileDown, down_s: Math.round((resumedAt - dropAt) / 1000), pause: pause.status, resume: resume.status },
    finale_players_listed: ((final.body.standings as unknown[]) ?? []).length,
    forged_at_s: Math.round(forgedAt / 1000),
  };
  console.log(JSON.stringify(report, null, 2));

  assert.equal(acceptedForeign.length, 0, "no phone accepted a forged or replayed event");
  assert.ok(monotonic, "every phone saw seq rise");
  assert.ok(rejected.signature >= PLAYERS - 1, "every phone rejected the forged events");
  assert.ok(rejected.seq + rejected.room + rejected.stale > 0, "replays were rejected");
  assert.ok(rotated, "forged traffic moved the room to a new topic");
  assert.ok(advancedWhileDown, "the room advanced with the host gone");
  assert.equal(pause.status, 200, "the host resumed control");
  assert.equal(resume.status, 200);
  assert.ok(sentBroadcasts.every((b) => b.status === 202), "every broadcast was accepted");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
