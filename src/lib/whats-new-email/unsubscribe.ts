import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { blobMarks, fileMarks, type MarkStore } from "../download/marks";
import { waitlistPrefix } from "../waitlist/store";
import { SITE_URL } from "./digest";

type Env = Record<string, string | undefined>;

export const UNSUBSCRIBE_PATH = "/api/whats-new/unsubscribe";
export const SECRET_MIN = 32;

function sign(key: string, secret: string): string {
  return createHmac("sha256", secret).update(`whats-new-unsubscribe:v1:${key}`).digest("base64url");
}

export function subscriberId(email: string, secret: string): string {
  return createHmac("sha256", secret).update(`whats-new-subscriber:v1:${email}`).digest("hex");
}

export function unsubscribeUrl(email: string, secret: string, origin = SITE_URL): string {
  const key = subscriberId(email, secret);
  return `${origin}${UNSUBSCRIBE_PATH}?k=${key}&s=${sign(key, secret)}`;
}

export function verifyUnsubscribe(k: string | null, s: string | null, secret: string | undefined): string | null {
  if (!secret || secret.length < SECRET_MIN || !k || !s || !/^[0-9a-f]{64}$/.test(k) || !/^[A-Za-z0-9_-]{43}$/.test(s)) return null;
  const want = Buffer.from(sign(k, secret));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? k : null;
}

export function unsubscribeSecret(env: Env = process.env): string | null {
  const s = env.WHATS_NEW_UNSUBSCRIBE_SECRET?.trim() ?? "";
  return s.length >= SECRET_MIN ? s : null;
}

export function getOptOutStore(env: Env = process.env, part: "optout" | "progress" = "optout"): MarkStore | null {
  const prefix = `${waitlistPrefix(env)}whats-new-${part}/`;
  if (env.BLOB_READ_WRITE_TOKEN?.trim() || env.BLOB_STORE_ID?.trim()) return blobMarks(prefix);
  if (!env.VERCEL_ENV && !env.VERCEL) return fileMarks(path.join(process.cwd(), ".data", prefix));
  return null;
}

export async function recordOptOut(store: MarkStore, key: string, now: number): Promise<void> {
  await store.set(`optout:${key}`, now);
}

export async function optedOutAt(store: MarkStore, key: string): Promise<number | null> {
  return store.get(`optout:${key}`);
}
