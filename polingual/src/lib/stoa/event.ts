export const EVENT_VERSION = "stoa/v1";
export const MAX_EVENT_AGE_MS = 30_000;

export type SignedEvent = {
  room_id: string;
  seq: number;
  type: string;
  issued_at: number;
  body: string;
  sig: string;
};

export function eventMessage(roomId: string, seq: number, type: string, issuedAt: number, bodyHashHex: string): string {
  return [EVENT_VERSION, roomId, String(seq), type, String(issuedAt), bodyHashHex].join("\n");
}

export function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const pad = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  try {
    const raw = atob(pad);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function isSignedEvent(v: unknown): v is SignedEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.room_id === "string" &&
    Number.isSafeInteger(e.seq) &&
    (e.seq as number) > 0 &&
    typeof e.type === "string" &&
    /^[a-z]{1,16}$/.test(e.type) &&
    Number.isSafeInteger(e.issued_at) &&
    typeof e.body === "string" &&
    e.body.length <= 64_000 &&
    typeof e.sig === "string" &&
    /^[A-Za-z0-9_-]{86}$/.test(e.sig)
  );
}
