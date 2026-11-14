import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { SignedEvent } from "./event";
import { bearer, createRoomKeys, hostToken, openSignKey, playerAccess, playerToken, readToken, roomSecrets, signEvent, stoaConfigured, type HostClaims, type PlayerClaims, type StoaEnv } from "./keys";
import { isNickname } from "./nicknames";
import { parseSettings, type QuestionBuilder } from "./questions";
import { base, dbConfigured, DB_TIMEOUT_MS, realtime, STATUS, UUID, verifyHostUser, type Fetcher, type Rpc } from "./live-db";
import { CODE, medianGrace, networkOf, newCode, parseMode, summaryCsv, type SummaryRow } from "./live-net";

export { clientIpFrom, CODE, CODE_ALPHABET, medianGrace, networkOf, newCode, parseMode, summaryCsv } from "./live-net";
export { dbConfigured, DB_TIMEOUT_MS, postgrestRpc, type Fetcher, type Rpc } from "./live-db";

export type LiveResult = { status: number; body: Record<string, unknown> };
export type LiveDeps = { env: StoaEnv; rpc: Rpc; send: Fetcher; build: QuestionBuilder; now?: () => number; random?: (max: number) => number };
type DbEvent = { seq: number; type: string; issued_at: number; payload: unknown };
type DbResult = { room_id: string; topic: string; topics?: string[]; sign_key: string; events: DbEvent[]; error?: string } & Record<string, unknown>;

const HOST_ACTIONS = ["start", "pause", "resume", "skip", "end", "lock", "unlock", "kick_all", "rotate"] as const;
const PLAYER_ACTIONS = ["move", "rename", "remove", "time"] as const;
const SWEEP_CONCURRENCY = 5;
const SWEEP_BUDGET_MS = 3000;

export function ipKey(ip: string | null, env: StoaEnv): string {
  const [secret] = roomSecrets(env);
  return createHmac("sha256", secret).update(`stoa:ip:${networkOf(ip)}`).digest("hex").slice(0, 32);
}


export function netKey(roomId: string, ip: string | null, env: StoaEnv): string {
  const [secret] = roomSecrets(env);
  return createHmac("sha256", secret).update(`stoa:net:${roomId}:${networkOf(ip)}`).digest("hex").slice(0, 32);
}


function signLast(res: DbResult, env: StoaEnv): SignedEvent | null {
  const last = res.events?.[res.events.length - 1];
  if (!last || !res.sign_key) return null;
  const key = openSignKey(res.room_id, res.sign_key, env);
  return key ? signEvent(res.room_id, last.seq, last.type, last.issued_at, last.payload, key) : null;
}

export async function broadcast(res: DbResult, deps: LiveDeps): Promise<number> {
  const ev = signLast(res, deps.env);
  if (!ev) return 0;
  const key = deps.env.POLINGUAL_DB_SERVICE_KEY!.trim();
  try {
    await deps.send(`${base(deps.env)}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: (res.topics?.length ? res.topics : [res.topic]).map((t) => ({ topic: `stoa:${t}`, event: "stoa", payload: ev, private: false })) }),
      signal: AbortSignal.timeout(DB_TIMEOUT_MS),
    });
  } catch {
    return 0;
  }
  return 1;
}

function strip(res: DbResult): Record<string, unknown> {
  const { sign_key: _s, events: _e, topic: _t, topics: _ts, error: _x, ...rest } = res;
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

export async function createRoom(authorization: string | null, body: unknown, deps: LiveDeps): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const uid = await verifyHostUser(bearer(authorization), deps.env, deps.send);
  if (!uid) return { status: 401, body: { error: "sign_in" } };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if ((b.product ?? "polingual") !== "polingual") return { status: 400, body: { error: "product" } };
  const settings = parseSettings(b.settings);
  if (!settings) return { status: 400, body: { error: "settings" } };
  const mode = parseMode(b);
  if (!mode) return { status: 400, body: { error: "settings" } };
  const random = deps.random ?? randomInt;
  const seed = random(2 ** 31 - 1);
  const questions = deps.build(seed, settings);
  if (!questions?.length) return { status: 503, body: { error: "no_questions" } };
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomId = randomUUID();
    const keys = createRoomKeys(roomId, deps.env);
    const r = await deps.rpc("live_create_room", {
      p_id: roomId, p_host: uid, p_code: newCode(random), p_product: "polingual", p_settings: { ...settings, school_mode: b.school_mode === true, ...mode }, p_seed: seed,
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
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
  if (!CODE.test(code)) return { status: 400, body: { error: "code" } };
  if (!isNickname(b.nickname)) return { status: 400, body: { error: "nickname" } };
  const res = await call(deps, "live_join", { p_code: code, p_nickname: b.nickname, p_ip: ipKey(ip, deps.env) });
  if (isResult(res)) return res;
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
  await call(deps, "live_tick", { p_room: c.rid });
  return { status: 200, body: { received_at: res.received_at } };
}

export async function submitProbe(authorization: string | null, body: unknown, deps: LiveDeps, ip: string | null = null): Promise<LiveResult> {
  const off = ready(deps.env);
  if (off) return off;
  const c = claimsFor(authorization, null, deps);
  if (!c || c.typ !== "player") return { status: 401, body: { error: "token" } };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const res = await call(deps, "live_probe", { p_room: c.rid, p_player: c.pid, p_tv: c.tv, p_grace: medianGrace(b.samples), p_failed: b.failed === true, p_net: netKey(c.rid, ip, deps.env) });
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

export async function roomSummary(roomId: string, authorization: string | null, deps: LiveDeps): Promise<LiveResult> {
  const c = await hostClaims(roomId, authorization, deps);
  if ("status" in c) return c;
  const r = await deps.rpc("live_summary", { p_room: c.rid, p_host: c.uid });
  if ("error" in r) return fail(r.error);
  const res = r.data as { code: string; mode?: string; rows: SummaryRow[]; error?: string };
  if (res.error) return fail(res.error);
  return { status: 200, body: { code: res.code, csv: summaryCsv(res.rows ?? [], res.mode === "chorus") } };
}

function sweepAllowed(authorization: string | null, env: StoaEnv): boolean {
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
  const clock = deps.now ?? Date.now;
  const start = clock();
  const queue = [...ids];
  let events = 0;
  let ticked = 0;
  const worker = async () => {
    while (queue.length && clock() - start < SWEEP_BUDGET_MS) {
      const id = queue.shift()!;
      const r = await deps.rpc("live_tick", { p_room: id });
      ticked++;
      if (!("error" in r)) events += await broadcast(r.data as DbResult, deps);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SWEEP_CONCURRENCY, ids.length) }, worker));
  return { status: 200, body: { rooms: ids.length, ticked, events } };
}
