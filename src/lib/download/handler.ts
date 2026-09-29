import { parseDownload, isExpired, type DownloadRequest } from "./core";
import { emailKey, saveSignup, type WaitlistStore } from "../waitlist/store";

export type NotifyOutcome = "sent" | "cooldown" | "failed" | "off";
export type DownloadNotifier = (request: DownloadRequest, firstTime: boolean) => Promise<NotifyOutcome>;

export interface DownloadDeps {
  store: (suspect: boolean) => WaitlistStore | null;
  notify?: DownloadNotifier;
  limited?: (ip: string) => boolean | Promise<boolean>;
  now?: () => string;
}

export interface DownloadResult {
  status: number;
  body: { ok: true; email: NotifyOutcome } | { error: string };
}

export async function handleDownload(body: unknown, ip: string, deps: DownloadDeps): Promise<DownloadResult> {
  try {
    if (await deps.limited?.(ip)) return { status: 429, body: { error: "Too many requests from here. Wait a minute and try again." } };
  } catch (err) {
    console.error("[download] rate limit check failed:", err instanceof Error ? err.message : err);
  }
  const parsed = parseDownload(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const store = deps.store(parsed.suspect);
  if (!store) return { status: 503, body: { error: "Downloads are closed for a moment. Try again later." } };
  let first: boolean;
  try {
    first = await saveSignup(store, parsed.request.input, deps.now?.());
  } catch (err) {
    console.error("[download] save failed:", err instanceof Error ? err.message : err);
    return { status: 502, body: { error: "Your request did not save. Try again in a minute." } };
  }
  let email: NotifyOutcome = "off";
  if (!parsed.suspect && deps.notify) {
    try {
      email = await deps.notify(parsed.request, first);
    } catch (err) {
      email = "failed";
      console.error("[download] notify failed:", err instanceof Error ? err.message : err);
    }
  }
  return { status: 200, body: { ok: true, email } };
}

export async function forgetDownload(store: WaitlistStore, email: string): Promise<void> {
  await store.remove(emailKey(email));
}

const PURGE_BATCH = 32;

export async function purgeExpired(store: WaitlistStore, now = new Date(), deadline = Infinity, clock: () => number = Date.now): Promise<{ removed: number; done: boolean }> {
  const keys = await store.keys();
  let removed = 0;
  for (let i = 0; i < keys.length; i += PURGE_BATCH) {
    if (clock() > deadline) return { removed, done: false };
    const batch = keys.slice(i, i + PURGE_BATCH);
    const entries = await Promise.all(batch.map((k) => store.read(k)));
    const stale = batch.filter((_, j) => {
      const e = entries[j];
      return e !== null && isExpired(e, now);
    });
    await Promise.all(stale.map((k) => store.remove(k)));
    removed += stale.length;
  }
  return { removed, done: true };
}

export function rateLimiter(max: number, windowMs: number, clock: () => number = Date.now): (ip: string) => boolean {
  const hits = new Map<string, number[]>();
  return (ip) => {
    const now = clock();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > max;
  };
}
