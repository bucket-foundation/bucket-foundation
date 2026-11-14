const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/;
const RESERVED = new Set(["admin", "api", "academy", "canon", "about", "login", "signin", "settings", "me", "new", "null", "undefined", "bucket", "foundation", "www"]);

export function normalizeHandle(input: string): string | null {
  const h = input.trim().toLowerCase();
  return HANDLE_RE.test(h) && !RESERVED.has(h) ? h : null;
}

export type Profile = { handle: string; displayName: string };
type ProfileLoad = { status: "ready"; profile: Profile | null } | { status: "signed-out" } | { status: "error" };
type ProfileSave = { ok: true; profile: Profile } | { ok: false; error: string; signIn?: boolean };
export type ProfileDeps = { fetch: typeof fetch; token: () => Promise<string | null> };

export const PROFILE_ME = "/api/academy/profile?me=1";
const PROFILE_SAVE = "/api/academy/profile";
export const SIGN_IN_AGAIN = "Sign in again to save.";

export function cleanHandle(input: string): { handle: string } | { error: string } {
  const h = normalizeHandle(input);
  return h ? { handle: h } : { error: "Use 3 to 32 lowercase letters, numbers, dashes or underscores, and pick a name that is not reserved." };
}

export function profileFrom(body: unknown): Profile | null {
  const p = (body as { profile?: { handle?: unknown; displayName?: unknown } } | null)?.profile;
  if (!p || typeof p.handle !== "string") return null;
  return { handle: p.handle, displayName: typeof p.displayName === "string" ? p.displayName : "" };
}

async function authed(deps: ProfileDeps, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const t = await deps.token();
  if (t) headers.set("authorization", `Bearer ${t}`);
  return deps.fetch(url, { ...init, headers, cache: "no-store" });
}

export async function loadProfile(deps: ProfileDeps): Promise<ProfileLoad> {
  try {
    const r = await authed(deps, PROFILE_ME);
    if (r.status === 401) return { status: "signed-out" };
    if (!r.ok) return { status: "error" };
    return { status: "ready", profile: profileFrom(await r.json()) };
  } catch {
    return { status: "error" };
  }
}

const SAVE_ERRORS: Record<string, string> = {
  invalid_handle: "That username is not allowed. Use letters, numbers, dashes or underscores.",
  handle_taken: "Someone already has that username. Try another.",
};

export async function saveProfile(p: Profile, deps: ProfileDeps): Promise<ProfileSave> {
  try {
    const r = await authed(deps, PROFILE_SAVE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: p.handle, display_name: p.displayName }) });
    if (r.status === 401) return { ok: false, error: SIGN_IN_AGAIN, signIn: true };
    const body = (await r.json().catch(() => null)) as { error?: string } | null;
    if (!r.ok) return { ok: false, error: SAVE_ERRORS[body?.error ?? ""] ?? "Your changes did not save. Try again in a minute." };
    return { ok: true, profile: profileFrom(body) ?? p };
  } catch {
    return { ok: false, error: "Your changes did not save. Check your connection and try again." };
  }
}
