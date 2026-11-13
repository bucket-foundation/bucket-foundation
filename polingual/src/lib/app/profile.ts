export type Profile = { handle: string; displayName: string };
export type ProfileLoad = { status: "ready"; profile: Profile | null } | { status: "error" };
export type ProfileSave = { ok: true; profile: Profile } | { ok: false; error: string };

const HANDLE = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/;

export function handleError(handle: string): string | null {
  return HANDLE.test(handle) ? null : "Use 3 to 32 lowercase letters, numbers, dashes or underscores.";
}

export function profileFrom(body: unknown): Profile | null {
  const p = (body as { profile?: { handle?: unknown; displayName?: unknown } } | null)?.profile;
  if (!p || typeof p.handle !== "string") return null;
  return { handle: p.handle, displayName: typeof p.displayName === "string" ? p.displayName : "" };
}

export async function loadProfile(f: typeof fetch = fetch): Promise<ProfileLoad> {
  try {
    const r = await f("/api/academy/profile", { cache: "no-store" });
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

export async function saveProfile(p: Profile, f: typeof fetch = fetch): Promise<ProfileSave> {
  try {
    const r = await f("/api/academy/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: p.handle, display_name: p.displayName }) });
    const body = (await r.json().catch(() => null)) as { error?: string } | null;
    if (!r.ok) return { ok: false, error: SAVE_ERRORS[body?.error ?? ""] ?? "Your changes did not save. Try again in a minute." };
    return { ok: true, profile: profileFrom(body) ?? p };
  } catch {
    return { ok: false, error: "Your changes did not save. Check your connection and try again." };
  }
}
