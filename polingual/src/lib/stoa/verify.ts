import { eventMessage, fromBase64Url, isSignedEvent, MAX_EVENT_AGE_MS } from "./event";

export type VerifyContext = {
  roomId: string;
  lastSeq: number;
  publicKey: string;
  now: number;
  clockOffsetMs: number;
};

export type VerifyReason = "shape" | "room" | "seq" | "stale" | "signature";
export type Verified = { ok: true; seq: number; type: string; issuedAt: number; payload: unknown } | { ok: false; reason: VerifyReason };

const keyCache = new Map<string, Promise<CryptoKey | null>>();

function importKey(publicKey: string): Promise<CryptoKey | null> {
  let hit = keyCache.get(publicKey);
  if (!hit) {
    const raw = fromBase64Url(publicKey);
    hit = raw && raw.length === 32
      ? crypto.subtle.importKey("raw", raw as BufferSource, { name: "Ed25519" }, false, ["verify"]).catch(() => null)
      : Promise.resolve(null);
    if (keyCache.size > 32) keyCache.clear();
    keyCache.set(publicKey, hit);
  }
  return hit;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyEvent(event: unknown, ctx: VerifyContext): Promise<Verified> {
  if (!isSignedEvent(event)) return { ok: false, reason: "shape" };
  if (event.room_id !== ctx.roomId) return { ok: false, reason: "room" };
  if (event.seq <= ctx.lastSeq) return { ok: false, reason: "seq" };
  const serverNow = ctx.now + ctx.clockOffsetMs;
  if (Math.abs(serverNow - event.issued_at) > MAX_EVENT_AGE_MS) return { ok: false, reason: "stale" };
  const key = await importKey(ctx.publicKey);
  const sig = fromBase64Url(event.sig);
  if (!key || !sig || sig.length !== 64) return { ok: false, reason: "signature" };
  const message = eventMessage(event.room_id, event.seq, event.type, event.issued_at, await sha256Hex(event.body));
  const good = await crypto.subtle
    .verify({ name: "Ed25519" }, key, sig as BufferSource, new TextEncoder().encode(message))
    .catch(() => false);
  if (!good) return { ok: false, reason: "signature" };
  let payload: unknown;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { ok: false, reason: "shape" };
  }
  return { ok: true, seq: event.seq, type: event.type, issuedAt: event.issued_at, payload };
}
