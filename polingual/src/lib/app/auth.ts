import { createMobileSync, type MobileSync } from "@academy/mobile-sync";
import { parseSession, type StoredSession, type TokenVault } from "@academy/token-store";

export const SESSION_KEY = "polingual-web/session/v1";
export const APP_ID = "polingual";
const SESSION_PATH = "/api/academy/session";

export class BrowserVault implements TokenVault {
  readonly kind = "browser-storage" as const;
  constructor(private readonly storage: () => Storage | null) {}
  async get(): Promise<StoredSession | null> {
    try {
      return parseSession(this.storage()?.getItem(SESSION_KEY) ?? null);
    } catch {
      return null;
    }
  }
  async set(s: StoredSession): Promise<void> {
    try {
      this.storage()?.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {
    }
  }
  async clear(): Promise<void> {
    try {
      this.storage()?.removeItem(SESSION_KEY);
    } catch {
    }
  }
}

export function needsBearer(url: URL, origin: string): boolean {
  return url.origin === origin && url.pathname.startsWith("/api/academy/") && !url.pathname.startsWith(SESSION_PATH);
}

export function bearerFetch(inner: typeof fetch, token: () => Promise<string | null>, origin: string): typeof fetch {
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, origin);
    if (!needsBearer(url, origin)) return inner(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("authorization")) {
      const t = await token();
      if (t) headers.set("authorization", `Bearer ${t}`);
    }
    return inner(input, { ...init, headers });
  };
  return wrapped as typeof fetch;
}

export interface AppAuth {
  mobile: MobileSync;
  userId(): Promise<string | null>;
}

export function createAppAuth(deps: { origin: string; storage: () => Storage | null; fetch: typeof fetch }): AppAuth {
  const vault = new BrowserVault(deps.storage);
  const mobile = createMobileSync({ base: deps.origin, storage: () => null, vault, fetch: deps.fetch, readLocal: () => null, app: APP_ID });
  return { mobile, userId: async () => ((await mobile.accessToken()) ? ((await vault.get())?.user_id ?? null) : null) };
}

const ERRORS: Record<string, string> = {
  bad_email: "Enter an email address like name@example.com.",
  bad_code: "That code did not match. Check the latest email and try again.",
  too_many_requests: "Too many tries. Wait ten minutes and try again.",
  send_failed: "The email did not send. Try again in a minute.",
  offline: "No connection. Check your network and try again.",
  review_log_disabled: "Sign-in is paused right now. Try again later.",
  sync_unavailable: "Sign-in is paused right now. Try again later.",
};

export function signInError(code: string | undefined): string {
  return ERRORS[code ?? ""] ?? "Something went wrong. Try again.";
}

let shared: AppAuth | null = null;

export function appAuth(): AppAuth {
  if (shared) return shared;
  const native = window.fetch.bind(window);
  shared = createAppAuth({
    origin: window.location.origin,
    storage: () => {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    },
    fetch: native,
  });
  const auth = shared;
  window.fetch = bearerFetch(native, () => auth.mobile.accessToken(), window.location.origin);
  return shared;
}
