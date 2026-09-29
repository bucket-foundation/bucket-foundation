import { parseDownload, isExpired, type DownloadRequest } from "./core";
import { emailKey, saveSignup, type WaitlistStore } from "../waitlist/store";

export type DownloadNotifier = (request: DownloadRequest, firstTime: boolean) => Promise<void>;

export const noNotifier: DownloadNotifier = async () => {};

export interface DownloadDeps {
  store: (suspect: boolean) => WaitlistStore | null;
  notify?: DownloadNotifier;
  limited?: (ip: string) => boolean;
  now?: () => string;
}

export interface DownloadResult {
  status: number;
  body: { ok: true } | { error: string };
}

export async function handleDownload(body: unknown, ip: string, deps: DownloadDeps): Promise<DownloadResult> {
  if (deps.limited?.(ip)) return { status: 429, body: { error: "Too many requests from here. Wait a minute and try again." } };
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
  if (!parsed.suspect) {
    try {
      await (deps.notify ?? noNotifier)(parsed.request, first);
    } catch (err) {
      console.error("[download] notify failed:", err instanceof Error ? err.message : err);
    }
  }
  return { status: 200, body: { ok: true } };
}

export async function forgetDownload(store: WaitlistStore, email: string): Promise<void> {
  await store.remove(emailKey(email));
}

export async function purgeExpired(store: WaitlistStore, now = new Date()): Promise<number> {
  let removed = 0;
  for (const key of await store.keys()) {
    const entry = await store.read(key);
    if (entry && isExpired(entry, now)) {
      await store.remove(key);
      removed++;
    }
  }
  return removed;
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
