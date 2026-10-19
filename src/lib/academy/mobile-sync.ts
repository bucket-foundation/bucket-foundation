import { createReviewSync, type Fetcher, type ReviewEvent, type ReviewSync } from "./review-sync";
import type { StoredSession, TokenVault } from "./token-store";
import type { EngineState } from "./engine";

export const MOBILE_REFRESH_MARGIN_S = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export interface MobileSyncDeps {
  base: string;
  storage: () => Storage | null;
  vault: TokenVault;
  fetch: Fetcher;
  readLocal: (branch: string) => EngineState | null;
  uuid?: () => string;
  now?: () => number;
}

export interface MobileSync {
  sync: ReviewSync;
  accessToken(): Promise<string | null>;
  sendCode(email: string): Promise<{ ok: boolean; error?: string }>;
  verifyCode(email: string, code: string): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
  route(path: string, method: string, body: string | null): Promise<Response | null>;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function createMobileSync(deps: MobileSyncDeps): MobileSync {
  const now = deps.now ?? Date.now;
  const uuid = deps.uuid ?? (() => crypto.randomUUID());
  const base = deps.base.replace(/\/$/, "");
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  let refreshing: Promise<StoredSession | null> | null = null;

  async function current(): Promise<StoredSession | null> {
    const s = await deps.vault.get();
    if (!s) return null;
    if (s.expires_at - MOBILE_REFRESH_MARGIN_S > now() / 1000) return s;
    if (!refreshing) refreshing = refreshOnce(s).finally(() => (refreshing = null));
    return refreshing;
  }

  async function refreshOnce(s: StoredSession): Promise<StoredSession | null> {
    const r = await session({ action: "refresh", refresh_token: s.refresh_token });
    if (r.status === 401) {
      await deps.vault.clear();
      sync.setUser(null);
      return null;
    }
    if (!r.ok) return null;
    const next = toStored(r.body, s.user_id);
    if (!next) return null;
    await deps.vault.set(next);
    return next;
  }

  async function session(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
    try {
      const r = await deps.fetch(`${base}/api/academy/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      return { ok: r.ok, status: r.status, body: ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown> };
    } catch {
      return { ok: false, status: 0, body: { error: "offline" } };
    }
  }

  function toStored(b: Record<string, unknown>, fallbackUser: string | null): StoredSession | null {
    const user = typeof b.user_id === "string" ? b.user_id : fallbackUser;
    if (typeof b.access_token !== "string" || typeof b.refresh_token !== "string" || typeof b.expires_at !== "number" || !user) return null;
    return { access_token: b.access_token, refresh_token: b.refresh_token, expires_at: b.expires_at, user_id: user, device_id: "mobile", supabase_url: base, anon_key: "" };
  }

  async function accessToken(): Promise<string | null> {
    return (await current())?.access_token ?? null;
  }

  async function authed(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await accessToken();
    if (!token) return json({ error: "signed_out" }, 401);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    return deps.fetch(base + path, { ...init, headers, cache: "no-store" });
  }

  const relative = (input: RequestInfo | URL) => {
    const u = new URL(String(input), base);
    return u.pathname + u.search;
  };

  const sync = createReviewSync({
    storage: deps.storage,
    fetch: (input, init) => authed(relative(input), init ?? {}),
    uuid,
    readLocal: deps.readLocal,
    pushSnapshot: async (branch, state) => (await authed("/api/academy/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch, data: state }) })).ok,
    now,
    lock: (fn) => fn(),
    onProblem: (p, n) => console.error(`bucket sync: ${p} (${n})`),
  });

  async function sendCode(email: string): Promise<{ ok: boolean; error?: string }> {
    if (!EMAIL_RE.test(email)) return { ok: false, error: "bad_email" };
    const r = await session({ action: "otp", email });
    return r.ok ? { ok: true } : { ok: false, error: String(r.body.error ?? "send_failed") };
  }

  async function verifyCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
    if (!EMAIL_RE.test(email) || !/^\d{6,10}$/.test(code)) return { ok: false, error: "bad_code" };
    const r = await session({ action: "verify", email, code });
    const stored = r.ok ? toStored(r.body, null) : null;
    if (!stored) return { ok: false, error: String(r.body.error ?? "bad_code") };
    await deps.vault.set(stored);
    sync.setUser(stored.user_id);
    return { ok: true };
  }

  async function logout(): Promise<void> {
    await deps.vault.clear();
    sync.setUser(null);
  }

  function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      sync.flush().catch((e) => console.error("bucket sync flush", e));
    }, 800);
  }

  async function route(path: string, method: string, body: string | null): Promise<Response | null> {
    const parse = () => {
      try {
        return body ? (JSON.parse(body) as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    };
    if (path === "/local/review-log" && method === "POST") {
      const b = parse();
      const r = b?.review as ReviewEvent | undefined;
      if (!b || typeof b.branch !== "string" || !BRANCH_RE.test(b.branch) || !r || typeof r.card_id !== "string" || typeof r.reviewed_at !== "number") return json({ error: "bad_request" }, 400);
      const q = sync.appendReview(b.branch, r);
      scheduleFlush();
      return json({ review_id: q.review_id });
    }
    if (path === "/local/review-log" && method === "GET") {
      await sync.flush();
      return json({ reviews: await sync.pullLog(), pending: sync.pending().length, held: sync.held().length });
    }
    if (path === "/local/account" && method === "GET") {
      const s = await current();
      return json({ signed_in: s !== null, user_id: s?.user_id ?? null, methods: ["email"], mode: sync.mode() });
    }
    if (path === "/local/account/email" && method === "POST") {
      const out = await sendCode(String(parse()?.email ?? "").trim());
      return json(out, out.ok ? 200 : 400);
    }
    if (path === "/local/account/verify" && method === "POST") {
      const b = parse();
      const out = await verifyCode(String(b?.email ?? "").trim(), String(b?.code ?? "").trim());
      return json(out, out.ok ? 200 : 400);
    }
    if (path === "/local/account/logout" && method === "POST") {
      await logout();
      return json({ ok: true });
    }
    return null;
  }

  return { sync, accessToken, sendCode, verifyCode, logout, route };
}
