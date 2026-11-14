import type { StoaEnv } from "./keys";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown } | { error: string }>;
export const DB_TIMEOUT_MS = 4000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const STATUS: Record<string, number> = {
  no_room: 404, no_player: 404, not_host: 403, removed: 403, stale_token: 409, too_many_rooms: 429,
  room_full: 409, name_taken: 409, not_open: 409, late: 409, duplicate: 409, paused: 409, bad_phase: 409, closed: 409,
  bad_action: 400, team: 400, code_taken: 503, slow_down: 429, too_soon: 429, locked: 409, bad_settings: 400,
};

export function dbConfigured(env: StoaEnv): boolean {
  return Boolean(env.POLINGUAL_DB_URL?.trim() && env.POLINGUAL_DB_SERVICE_KEY?.trim() && env.POLINGUAL_DB_ANON_KEY?.trim());
}

export function base(env: StoaEnv): string {
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

export function realtime(env: StoaEnv, topic: string) {
  return { url: base(env), key: env.POLINGUAL_DB_ANON_KEY!.trim(), topic: `stoa:${topic}` };
}
