import { createHmac, timingSafeEqual } from "node:crypto";
import type { DownloadNotifier } from "./handler";

type Env = Record<string, string | undefined>;
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_NOTIFY_TO = "gianyrox@gmail.com";
export const DEFAULT_FROM = "Bucket Foundation <downloads@bucket.foundation>";
const RESEND_URL = "https://api.resend.com/emails";

function sign(expires: number, secret: string): string {
  return createHmac("sha256", secret).update(`download:${expires}`).digest("base64url");
}

export function downloadLink(origin: string, secret: string, now: number): string {
  const expires = now + LINK_TTL_MS;
  return `${origin}/api/download/file?e=${expires}&s=${sign(expires, secret)}`;
}

export function linkValid(e: string | null, s: string | null, secret: string | undefined, now: number): boolean {
  if (!secret || !e || !s || !/^\d{1,16}$/.test(e)) return false;
  const expires = Number(e);
  if (expires < now || expires > now + LINK_TTL_MS) return false;
  const want = Buffer.from(sign(expires, secret));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got);
}

async function send(fetcher: Fetch, key: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetcher(RESEND_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

export function resendNotifier(env: Env = process.env, fetcher: Fetch = fetch, clock: () => number = Date.now): DownloadNotifier | null {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) return null;
  const from = env.DOWNLOAD_FROM?.trim() || DEFAULT_FROM;
  const to = env.DOWNLOAD_NOTIFY_TO?.trim() || DEFAULT_NOTIFY_TO;
  const origin = (env.DOWNLOAD_ORIGIN?.trim() || "https://bucket.foundation").replace(/\/$/, "");
  const secret = env.DOWNLOAD_LINK_SECRET?.trim();
  return async (request) => {
    const now = clock();
    const at = new Date(now).toISOString();
    const jobs: Promise<void>[] = [
      send(fetcher, key, { from, to, subject: "Bucket download request", text: `${request.input.email} requested the desktop app at ${at}.` }),
    ];
    if (secret) {
      const link = downloadLink(origin, secret, now);
      jobs.push(
        send(fetcher, key, {
          from,
          to: request.input.email,
          subject: "Your Bucket download link",
          text: `Download the Bucket desktop app: ${link}\n\nThe link works for 24 hours. Check the signature before you install: ${origin}/.well-known/bucket-release.pub`,
        }),
      );
    }
    const results = await Promise.allSettled(jobs);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (!secret) console.error("[download] DOWNLOAD_LINK_SECRET unset; no link sent");
    if (failed.length) throw new Error(failed.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join("; "));
  };
}
