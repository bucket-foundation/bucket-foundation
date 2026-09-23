export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,23}$/;

const RESERVED = new Set(["admin", "root", "system", "bucket", "canon", "api", "me", "null", "undefined", "sign-in", "account"]);

export type HandleCheck = { ok: true; handle: string } | { ok: false; reason: "empty" | "format" | "reserved" };

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function checkHandle(raw: string): HandleCheck {
  const handle = normalizeHandle(raw);
  if (!handle) return { ok: false, reason: "empty" };
  if (!HANDLE_RE.test(handle)) return { ok: false, reason: "format" };
  if (RESERVED.has(handle)) return { ok: false, reason: "reserved" };
  return { ok: true, handle };
}
