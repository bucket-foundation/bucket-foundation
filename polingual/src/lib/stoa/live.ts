import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { SignedEvent } from "./event";
import { bearer, createRoomKeys, hostToken, openSignKey, playerAccess, playerToken, readToken, signEvent, stoaConfigured, type HostClaims, type PlayerClaims, type StoaEnv } from "./keys";
import { isNickname } from "./nicknames";
import { parseSettings, type QuestionBuilder } from "./questions";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type LiveResult = { status: number; body: Record<string, unknown> };
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown } | { error: string }>;
export type LiveDeps = { env: StoaEnv; rpc: Rpc; send: Fetcher; build: QuestionBuilder; now?: () => number; random?: (max: number) => number };
type DbEvent = { seq: number; type: string; issued_at: number; payload: unknown };
type DbResult = { room_id: string; topic: string; sign_key: string; events: DbEvent[]; error?: string } & Record<string, unknown>;

export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE = /^[0-9A-HJKMNP-TV-Z]{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const HOST_ACTIONS = ["start", "pause", "resume", "skip", "end"] as const;
export const PLAYER_ACTIONS = ["move", "rename", "remove", "time"] as const;
export const DB_TIMEOUT_MS = 4000;
export const GRACE_CAP_MS = 1000;

const STATUS: Record<string, number> = {
  no_room: 404, no_player: 404, not_host: 403, removed: 403, stale_token: 409, too_many_rooms: 429,
  room_full: 409, name_taken: 409, not_open: 409, late: 409, duplicate: 409, paused: 409, bad_phase: 409, closed: 409,
  bad_action: 400, code_taken: 503,
};

export class Window {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number, private maxKeys = 10000) {}
  private recent(key: string, now: number): number[] {
    return (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
  }
  full(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.limit;
  }
  hit(key: string, now = Date.now()): boolean {
    const r = this.recent(key, now);
    if (r.length >= this.limit) return false;
    r.push(now);
    this.hits.delete(key);
    this.hits.set(key, r);
    if (this.hits.size > this.maxKeys) this.hits.delete(this.hits.keys().next().value as string);
    return true;
  }
}

export const joinsPerCode = new Window(150, 60_000);
export const missesPerIp = new Window(60, 60_000);

export function dbConfigured(env: StoaEnv): boolean {
  return Boolean(env.POLINGUAL_DB_URL?.trim() && env.POLINGUAL_DB_SERVICE_KEY?.trim() && env.POLINGUAL_DB_ANON_KEY?.trim());
}

function base(env: StoaEnv): string {
  return env.POLINGUAL_DB_URL!.trim().replace(/\/$/, "");
}

export function postgrestRpc(env: StoaEnv, send: Fetcher): Rpc {
  return async (fn, args) => {
    const key = env.POLINGUAL_DB_SERVICE_KEY!.trim();
    try {
      const r = await send(`${base(env)}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "bucket", "Accept-Profile": "bucket" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(DB_TIMEOUT_MS),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = body && typeof body === "object" ? String((body as { message?: unknown }).message ?? "") : "";
        return { error: msg in STATUS ? msg : "db" };
      }
      return { data: body };
    } catch {
      return { error: "db" };
    }
  };
}

export async function verifyHostUser(token: string | null, env: StoaEnv, send: Fetcher): Promise<string | null> {
  if (!token || token.length > 4096) return null;
  try {
    const r = await send(`${base(env)}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: env.POLINGUAL_DB_ANON_KEY!.trim(), Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(DB_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const u = (await r.json()) as { id?: unknown };
    return typeof u.id === "string" && UUID.test(u.id) ? u.id : null;
  } catch {
    return null;
  }
}

function realtime(env: StoaEnv, topic: string) {
  return { url: base(env), key: env.POLINGUAL_DB_ANON_KEY!.trim(), topic: `stoa:${topic}` };
}

export function signAll(res: DbResult, env: StoaEnv): SignedEvent[] {
  if (!res.events?.length) return [];
  const key = openSignKey(res.room_id, res.sign_key, env);
  if (!key) return [];
  return res.events.map((e) => signEvent(res.room_id, e.seq, e.type, e.issued_at, e.payload, key));
}

export async function broadcast(res: DbResult, deps: LiveDeps): Promise<number> {
  const signed = signAll(res, deps.env);
  if (!signed.length) return 0;
  const key = deps.env.POLINGUAL_DB_SERVICE_KEY!.trim();
  try {
    await deps.send(`${base(deps.env)}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: signed.map((ev) => ({ topic: `stoa:${res.topic}`, event: "stoa", payload: ev, private: false })) }),
      signal: AbortSignal.timeout(DB_TIMEOUT_MS),
    });
  } catch {
    return 0;
  }
  return signed.length;
}

function strip(res: DbResult): Record<string, unknown> {
  const { sign_key: _s, events: _e, topic: _t, error: _x, ...rest } = res;
  return rest;
}

function fail(code: string): LiveResult {
  return { status: STATUS[code] ?? 502, body: { error: code } };
}

async function call(deps: LiveDeps, fn: string, args: Record<string, unknown>): Promise<DbResult | LiveResult> {
  const r = await deps.rpc(fn, args);
  if ("error" in r) return fail(r.error);
  const res = r.data as DbResult;
  await broadcast(res, deps);
  if (res.error) return fail(res.error);
  return res;
}

function isResult(v: DbResult | LiveResult): v is LiveResult {
  return typeof (v as LiveResult).status === "number";
}

function ready(env: StoaEnv): LiveResult | null {
  return stoaConfigured(env) && dbConfigured(env) ? null : { status: 503, body: { error: "offline" } };
}

export function newCode(random: (max: number) => number = randomInt): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return s;
}

export async function createRoom(authorization: string | null, body: unknown, deps: LiveDeps): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const uid = await verifyHostUser(bearer(authorization), deps.env, deps.send);
  if (!uid) return { status: 401, body: { error: "sign_in" } };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if ((b.product ?? "polingual") !== "polingual") return { status: 400, body: { error: "product" } };
  const settings = parseSettings(b.settings);
  if (!settings) return { status: 400, body: { error: "settings" } };
  const random = deps.random ?? randomInt;
  const seed = random(2 ** 31 - 1);
  const questions = deps.build(seed, settings);
  if (!questions?.length) return { status: 503, body: { error: "no_questions" } };
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomId = randomUUID();
    const keys = createRoomKeys(roomId, deps.env);
    const r = await deps.rpc("live_create_room", {
      p_id: roomId, p_host: uid, p_code: newCode(random), p_product: "polingual", p_settings: settings, p_seed: seed,
      p_sign_key: keys.signKey, p_verify_key: keys.verifyKey, p_questions: questions,
    });
    if ("error" in r) {
      if (r.error === "code_taken") continue;
      return fail(r.error);
    }
    const room = r.data as { room_id: string; code: string; topic: string; expires_at: number; verify_key: string };
    return {
      status: 200,
      body: {
        room_id: room.room_id, code: room.code, expires_at: room.expires_at, verify_key: room.verify_key,
        host_token: hostToken(room.room_id, uid, room.expires_at, deps.env, deps.now?.()),
        realtime: realtime(deps.env, room.topic),
      },
    };
  }
  return fail("code_taken");
}

export async function joinRoom(body: unknown, ip: string | null, deps: LiveDeps): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const now = deps.now?.() ?? Date.now();
  const who = ip || "unknown";
  if (missesPerIp.full(who, now)) return { status: 429, body: { error: "slow_down" } };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
  if (!CODE.test(code)) {
    missesPerIp.hit(who, now);
    return { status: 400, body: { error: "code" } };
  }
  if (!isNickname(b.nickname)) return { status: 400, body: { error: "nickname" } };
  if (!joinsPerCode.hit(code, now)) return { status: 429, body: { error: "slow_down" } };
  const res = await call(deps, "live_join", { p_code: code, p_nickname: b.nickname });
  if (isResult(res)) {
    if (res.body.error === "no_room") missesPerIp.hit(who, now);
    return res;
  }
  const token = playerToken(res.room_id, String(res.player_id), Number(res.token_version), Number(res.expires_at), deps.env, now);
  return { status: 200, body: { room_id: res.room_id, player_id: res.player_id, token, verify_key: res.verify_key, realtime: realtime(deps.env, res.topic) } };
}

function claimsFor(authorization: string | null, roomId: string | null, deps: LiveDeps): PlayerClaims | HostClaims | null {
  const c = readToken(bearer(authorization), deps.env, deps.now?.());
  if (!c || (roomId !== null && c.rid !== roomId)) return null;
  return c;
}

export async function roomState(roomId: string, authorization: string | null, deps: LiveDeps): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const c = claimsFor(authorization, roomId, deps);
  if (!c) return { status: 401, body: { error: "token" } };
  const res = await call(deps, "live_state", { p_room: c.rid, p_player: c.typ === "player" ? c.pid : null, p_host: c.typ === "host" ? c.uid : null });
  if (isResult(res)) return res;
  const out: Record<string, unknown> = { ...strip(res), realtime: realtime(deps.env, res.topic) };
  if (c.typ === "player") {
    const room = res.room as { token_version: number; expires_at: number };
    const access = playerAccess(c, (res.player as { removed: boolean } | undefined) ?? null, room.token_version);
    if (access === "removed") return fail("removed");
    if (access === "stale") out.token = playerToken(c.rid, c.pid, room.token_version, room.expires_at, deps.env, deps.now?.());
  }
  return { status: 200, body: out };
}

export async function submitAnswer(authorization: string | null, body: unknown, deps: LiveDeps): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const c = claimsFor(authorization, null, deps);
  if (!c || c.typ !== "player") return { status: 401, body: { error: "token" } };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idx = b.idx;
  const choice = b.choice;
  if (!Number.isInteger(idx) || (idx as number) < 0 || (idx as number) > 99) return { status: 400, body: { error: "idx" } };
  if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) > 3) return { status: 400, body: { error: "choice" } };
  const res = await call(deps, "live_answer", { p_room: c.rid, p_player: c.pid, p_tv: c.tv, p_idx: idx, p_choice: choice });
  if (isResult(res)) return res;
  return { status: 200, body: { received_at: res.received_at } };
}

export function medianGrace(samples: unknown): number | null {
  if (!Array.isArray(samples)) return null;
  const delays = samples
    .slice(0, 20)
    .map((s) => (s && typeof s === "object" ? Number((s as Record<string, unknown>).received_at) - Number((s as Record<string, unknown>).sent_at) : NaN))
    .filter((d) => Number.isFinite(d))
    .sort((a, b) => a - b);
  if (delays.length < 3) return null;
  const mid = delays.length >> 1;
  const m = delays.length % 2 ? delays[mid] : (delays[mid - 1] + delays[mid]) / 2;
  return Math.round(Math.min(GRACE_CAP_MS, Math.max(0, m)));
}

export async function submitProbe(authorization: string | null, body: unknown, deps: LiveDeps): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const c = claimsFor(authorization, null, deps);
  if (!c || c.typ !== "player") return { status: 401, body: { error: "token" } };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const failures = Number.isInteger(b.failures) ? Math.max(0, Math.min(50, b.failures as number)) : 0;
  const res = await call(deps, "live_probe", { p_room: c.rid, p_player: c.pid, p_tv: c.tv, p_grace: medianGrace(b.samples), p_failures: failures });
  if (isResult(res)) return res;
  return { status: 200, body: { rotated: res.rotated === true } };
}

async function hostClaims(roomId: string, authorization: string | null, deps: LiveDeps): Promise<HostClaims | LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const c = claimsFor(authorization, roomId, deps);
  if (!c || c.typ !== "host") return { status: 401, body: { error: "token" } };
  return c;
}

export async function hostAction(roomId: string, action: string, authorization: string | null, deps: LiveDeps): Promise<LiveResult> {
  if (!(HOST_ACTIONS as readonly string[]).includes(action)) return { status: 404, body: { error: "action" } };
  const c = await hostClaims(roomId, authorization, deps);
  if ("status" in c) return c;
  const res = await call(deps, "live_host", { p_room: c.rid, p_host: c.uid, p_action: action });
  if (isResult(res)) return res;
  return { status: 200, body: { ok: true, events: res.events.length } };
}

export async function playerAction(roomId: string, playerId: string, action: string, authorization: string | null, body: unknown, deps: LiveDeps): Promise<LiveResult> {
  if (!(PLAYER_ACTIONS as readonly string[]).includes(action)) return { status: 404, body: { error: "action" } };
  if (!UUID.test(playerId)) return { status: 404, body: { error: "no_player" } };
  const c = await hostClaims(roomId, authorization, deps);
  if ("status" in c) return c;
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  let value: string | null = null;
  if (action === "rename") {
    if (!isNickname(b.nickname)) return { status: 400, body: { error: "nickname" } };
    value = b.nickname;
  } else if (action === "time") {
    const f = Number(b.factor);
    if (!(f >= 1 && f <= 3)) return { status: 400, body: { error: "factor" } };
    value = f.toFixed(2);
  } else if (action === "move") {
    if (!Number.isInteger(b.team) || (b.team as number) < 0 || (b.team as number) > 3) return { status: 400, body: { error: "team" } };
    value = String(b.team);
  }
  const res = await call(deps, "live_player_admin", { p_room: c.rid, p_host: c.uid, p_player: playerId, p_action: action, p_value: value });
  if (isResult(res)) return res;
  return { status: 200, body: { ok: true, token_version: res.token_version } };
}

export function sweepAllowed(authorization: string | null, env: StoaEnv): boolean {
  const want = env.STOA_SWEEP_SECRET?.trim();
  const got = bearer(authorization);
  if (!want || want.length < 32 || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sweep(authorization: string | null, deps: LiveDeps): Promise<LiveResult> {
  if (!sweepAllowed(authorization, deps.env)) return { status: 401, body: { error: "token" } };
  const off = ready(deps.env);
  if (off) return off;
  const due = await deps.rpc("live_due", {});
  if ("error" in due) return fail(due.error);
  const ids = (due.data as string[]).filter((id) => UUID.test(id));
  let events = 0;
  for (const id of ids) {
    const r = await deps.rpc("live_tick", { p_room: id });
    if ("error" in r) continue;
    events += await broadcast(r.data as DbResult, deps);
  }
  return { status: 200, body: { rooms: ids.length, events } };
}
