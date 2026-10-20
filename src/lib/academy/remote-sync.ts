import { randomBytes, randomUUID } from "node:crypto";
import type { EngineState } from "./engine";
import { canonicalRequest, DEVICE_HEADER, formatDeviceHeader } from "./device-sign";
import { createReviewSync, type Fetcher, type ReviewSync } from "./review-sync";
import { canonicalSyncBase } from "./sync-base";
import { refreshSession, type StoredSession, type TokenVault } from "./token-store";

export { canonicalSyncBase, DEFAULT_SYNC_BASE } from "./sync-base";
export const REFRESH_MARGIN_S = 60;

export interface DeviceSigner {
  id: string;
  publicKey: string;
  sign(message: string): string;
}

export interface RemoteDeps {
  base: string;
  storage: () => Storage | null;
  vault: TokenVault;
  device: DeviceSigner;
  readLocal: (branch: string) => EngineState | null;
  fetch?: Fetcher;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  offline?: () => boolean;
}

export interface LoginPrompt {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  warning?: string;
}

export const START_REASONS: Readonly<Record<string, string>> = {
  review_log_disabled: "account sync is turned off on the site",
  sync_unavailable: "the site has no account database configured",
};

async function pageWarning(f: Fetcher, url: string): Promise<string | undefined> {
  try {
    const r = await f(url, { method: "GET", redirect: "follow" });
    return r.ok ? undefined : `the sign-in page answered ${r.status}`;
  } catch (e) {
    return `the sign-in page is unreachable (${e instanceof Error ? e.message : String(e)})`;
  }
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export interface RemoteSync {
  sync: ReviewSync;
  login(kind: "desktop" | "cli", label: string, onPrompt: (p: LoginPrompt) => void): Promise<StoredSession>;
  logout(): Promise<void>;
  session(): Promise<StoredSession | null>;
  signedFetch(path: string, init?: RequestInit): Promise<Response>;
}

export function createRemoteSync(deps: RemoteDeps): RemoteSync {
  const f: Fetcher = deps.fetch ?? ((i, n) => fetch(i, n));
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const offline = deps.offline ?? (() => false);
  const base = canonicalSyncBase(deps.base);

  async function refresh(s: StoredSession): Promise<StoredSession | null> {
    const out = await refreshSession(f, s, now());
    if (out.kind === "revoked") {
      await deps.vault.clear();
      sync.setUser(null);
      return null;
    }
    if (out.kind === "failed") throw new SyncError(`session refresh answered ${out.status}`, "refresh_failed");
    await deps.vault.set(out.session);
    return out.session;
  }

  async function current(): Promise<StoredSession | null> {
    const s = await deps.vault.get();
    if (!s) return null;
    if (s.device_id !== deps.device.id) throw new SyncError("the stored session belongs to another device key; run bkt logout and sign in again", "device_mismatch");
    return s.expires_at - REFRESH_MARGIN_S > now() / 1000 ? s : refresh(s);
  }

  function signed(s: StoredSession, path: string, init: RequestInit): RequestInit {
    const method = (init.method ?? "GET").toUpperCase();
    const body = typeof init.body === "string" ? init.body : "";
    const ts = now();
    const nonce = randomBytes(18).toString("base64url");
    const sig = deps.device.sign(canonicalRequest(method, path, ts, nonce, body));
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${s.access_token}`);
    headers.set(DEVICE_HEADER, formatDeviceHeader({ deviceId: deps.device.id, ts, nonce, sig }));
    return { ...init, method, headers };
  }

  async function signedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (offline()) throw new SyncError("Bucket is set to stay offline on this computer", "offline");
    let s = await current();
    if (!s) return new Response(JSON.stringify({ error: "signed_out" }), { status: 401, headers: { "content-type": "application/json" } });
    let res = await f(base + path, signed(s, path, init));
    if (res.status === 401) {
      s = await refresh(s);
      if (!s) return res;
      res = await f(base + path, signed(s, path, init));
    }
    return res;
  }

  const relative = (input: RequestInfo | URL) => {
    const u = new URL(String(input), base);
    return u.pathname + u.search;
  };

  const sync = createReviewSync({
    storage: deps.storage,
    fetch: (input, init) => signedFetch(relative(input), init ?? {}),
    uuid: randomUUID,
    readLocal: deps.readLocal,
    pushSnapshot: async (branch, state) => (await signedFetch("/api/academy/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch, data: state }) })).ok,
    now,
    lock: (fn) => fn(),
    deviceId: deps.device.id,
    onProblem: (p, n) => console.error(`bkt sync: ${p} (${n})`),
  });

  async function login(kind: "desktop" | "cli", label: string, onPrompt: (p: LoginPrompt) => void): Promise<StoredSession> {
    if (offline()) throw new SyncError("Bucket is set to stay offline on this computer", "offline");
    const start = await f(`${base}/api/academy/device/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: deps.device.id, public_key: deps.device.publicKey, kind, label }),
    });
    if (!start.ok) {
      const err = ((await start.json().catch(() => ({}))) as { error?: string }).error ?? "";
      throw new SyncError(`sign-in could not start: ${START_REASONS[err] ?? `${base} answered ${start.status}${err ? ` ${err}` : ""}`}`, "start_failed");
    }
    const s = (await start.json()) as { device_code: string; user_code: string; verification_uri: string; expires_in: number; interval: number };
    const verification_uri = `${s.verification_uri}?code=${s.user_code}`;
    const warning = await pageWarning(f, verification_uri);
    onPrompt({ user_code: s.user_code, verification_uri, expires_in: s.expires_in, ...(warning ? { warning } : {}) });
    const deadline = now() + s.expires_in * 1000;
    while (now() < deadline) {
      await sleep(s.interval * 1000);
      const ts = now();
      const r = await f(`${base}/api/academy/device/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ device_code: s.device_code, ts, sig: deps.device.sign(`bkt-device-token\n${s.device_code}\n${ts}`) }),
      });
      if (r.status === 428) continue;
      const j = (await r.json().catch(() => ({}))) as Partial<StoredSession> & { error?: string };
      if (!r.ok) throw new SyncError(`sign-in failed: ${j.error ?? r.status}`, j.error ?? "token_failed");
      const session = { ...j, device_id: deps.device.id } as StoredSession;
      await deps.vault.set(session);
      sync.setUser(session.user_id);
      return session;
    }
    throw new SyncError("the sign-in code expired before it was approved", "expired");
  }

  async function logout(): Promise<void> {
    const s = await deps.vault.get();
    if (s) await f(`${s.supabase_url}/auth/v1/logout?scope=local`, { method: "POST", headers: { apikey: s.anon_key, authorization: `Bearer ${s.access_token}` } }).catch(() => undefined);
    await deps.vault.clear();
    sync.setUser(null);
  }

  return { sync, login, logout, session: current, signedFetch };
}
