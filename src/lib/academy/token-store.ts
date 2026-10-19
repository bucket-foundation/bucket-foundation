export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  device_id: string;
  supabase_url: string;
  anon_key: string;
}

export interface TokenVault {
  readonly kind: "libsecret" | "file" | "memory" | "secure-storage";
  get(): Promise<StoredSession | null>;
  set(s: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof s.access_token !== "string" || typeof s.refresh_token !== "string" || typeof s.expires_at !== "number" || typeof s.user_id !== "string") return null;
    if (typeof s.device_id !== "string" || typeof s.supabase_url !== "string" || typeof s.anon_key !== "string") return null;
    return s as StoredSession;
  } catch {
    return null;
  }
}

export type SessionFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type RefreshOutcome = { kind: "ok"; session: StoredSession } | { kind: "revoked" } | { kind: "failed"; status: number };

export async function refreshSession(f: SessionFetch, s: StoredSession, nowMs: number): Promise<RefreshOutcome> {
  const r = await f(`${s.supabase_url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: s.anon_key, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (r.status === 400 || r.status === 401 || r.status === 403) return { kind: "revoked" };
  if (!r.ok) return { kind: "failed", status: r.status };
  const j = (await r.json()) as { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number };
  return { kind: "ok", session: { ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at ?? Math.floor(nowMs / 1000) + (j.expires_in ?? 3600) } };
}

export class MemoryVault implements TokenVault {
  readonly kind = "memory" as const;
  private value: string | null = null;
  async get() {
    return parseSession(this.value);
  }
  async set(s: StoredSession) {
    this.value = JSON.stringify(s);
  }
  async clear() {
    this.value = null;
  }
}
