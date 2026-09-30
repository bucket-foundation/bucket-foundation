import { createHmac, timingSafeEqual } from "node:crypto";
import type { DownloadNotifier } from "./handler";
import type { MarkStore } from "./marks";
import { emailKey } from "../waitlist/store";

type Env = Record<string, string | undefined>;
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const LINK_REUSE_MS = 10 * 60 * 1000;
export const EMAIL_COOLDOWN_MS = 60 * 60 * 1000;
export const DEFAULT_NOTIFY_TO = "gianyrox@gmail.com";
export const DEFAULT_FROM = "Bucket Foundation <downloads@bucket.foundation>";
const RESEND_URL = "https://api.resend.com/emails";

function sign(key: string, expires: number, secret: string): string {
  return createHmac("sha256", secret).update(`download:${key}:${expires}`).digest("base64url");
}

export function downloadLink(origin: string, secret: string, email: string, now: number): string {
  const expires = now + LINK_TTL_MS;
  const key = emailKey(email);
  return `${origin}/api/download/file?k=${key}&e=${expires}&s=${sign(key, expires, secret)}`;
}

export type LinkCheck = { ok: true; key: string; sig: string } | { ok: false };

export function checkLink(q: URLSearchParams, secret: string | undefined, now: number): LinkCheck {
  const k = q.get("k");
  const e = q.get("e");
  const s = q.get("s");
  if (!secret || !k || !e || !s || !/^[0-9a-f]{64}$/.test(k) || !/^\d{1,16}$/.test(e)) return { ok: false };
  const expires = Number(e);
  if (expires < now || expires > now + LINK_TTL_MS) return { ok: false };
  const want = Buffer.from(sign(k, expires, secret));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? { ok: true, key: k, sig: s } : { ok: false };
}

export async function redeemLink(marks: MarkStore, sig: string, now: number): Promise<boolean> {
  const first = await marks.get(`used:${sig}`);
  if (first === null) {
    await marks.set(`used:${sig}`, now);
    return true;
  }
  return now - first <= LINK_REUSE_MS;
}

export interface NotifierConfig {
  apiKey: string;
  secret: string;
  from: string;
  to: string;
  origin: string;
}

export function notifierConfig(env: Env = process.env): NotifierConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const secret = env.DOWNLOAD_LINK_SECRET?.trim();
  if (!apiKey || !secret || !env.DOWNLOAD_ARTIFACT_BLOB?.trim()) return null;
  return {
    apiKey,
    secret,
    from: env.DOWNLOAD_FROM?.trim() || DEFAULT_FROM,
    to: env.DOWNLOAD_NOTIFY_TO?.trim() || DEFAULT_NOTIFY_TO,
    origin: (env.DOWNLOAD_ORIGIN?.trim() || "https://bucket.foundation").replace(/\/$/, ""),
  };
}

async function send(fetcher: Fetch, key: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetcher(RESEND_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

export function resendNotifier(config: NotifierConfig, marks: MarkStore, fetcher: Fetch = fetch, clock: () => number = Date.now): DownloadNotifier {
  return async (request) => {
    const now = clock();
    const email = request.input.email;
    const cooldownKey = `mail:${emailKey(email)}`;
    const last = await marks.get(cooldownKey);
    if (last !== null && now - last < EMAIL_COOLDOWN_MS) return "cooldown";
    await marks.set(cooldownKey, now);
    const at = new Date(now).toISOString();
    const link = downloadLink(config.origin, config.secret, email, now);
    const results = await Promise.allSettled([
      send(fetcher, config.apiKey, { from: config.from, to: email, subject: "Your Bucket download link", text: `Download the Bucket desktop app: ${link}\n\nThe link works for 24 hours. Check the signature before you install: ${config.origin}/.well-known/bucket-release.pub` }),
      send(fetcher, config.apiKey, { from: config.from, to: config.to, subject: "Bucket download request", text: `${email} requested the desktop app at ${at}.` }),
    ]);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    for (const f of failed) console.error("[download] notify failed:", f.reason instanceof Error ? f.reason.message : f.reason);
    return results[0].status === "fulfilled" ? "sent" : "failed";
  };
}
