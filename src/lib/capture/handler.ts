import { CAPTURE_LEGS, LEG_TIMEOUT_MS, parseCapture, storePart, type CaptureRecord, type Delivered } from "./core";
import type { DownloadNotifier, NotifyOutcome } from "../download/handler";
import { saveSignup, type WaitlistStore } from "../waitlist/store";
import type { StorePart } from "../waitlist/store";

export type CaptureLegSend = (record: CaptureRecord) => Promise<unknown>;

export interface CaptureDeps {
  store: (part: StorePart) => WaitlistStore | null;
  limited?: (ip: string) => boolean | Promise<boolean>;
  notify?: DownloadNotifier;
  analytics?: CaptureLegSend;
  slack?: CaptureLegSend;
  defer?: (work: Promise<unknown>) => void;
  now?: () => string;
  timeoutMs?: number;
}

export type CaptureBody = { ok: true; email: NotifyOutcome; delivered: Delivered } | { error: string };

export interface CaptureResult {
  status: number;
  body: CaptureBody;
}

export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}

function emptyDelivered(): Delivered {
  return Object.fromEntries(CAPTURE_LEGS.map((leg) => [leg, null])) as Delivered;
}

export async function handleCapture(body: unknown, ip: string, deps: CaptureDeps): Promise<CaptureResult> {
  const parsed = parseCapture(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  try {
    if (await deps.limited?.(ip)) return { status: 429, body: { error: "Too many signups from here. Wait 30 seconds and try again." } };
  } catch (err) {
    console.error("[capture] rate limit check failed:", err instanceof Error ? err.message : err);
  }
  const store = deps.store(storePart(parsed.source, parsed.suspect));
  if (!store) return { status: 503, body: { error: "Signups are closed for a moment. Try again later." } };
  const at = deps.now?.() ?? new Date().toISOString();
  let first: boolean;
  try {
    first = await saveSignup(store, parsed.input, at);
  } catch (err) {
    console.error("[capture] save failed:", err instanceof Error ? err.message : err);
    return { status: 502, body: { error: "Your signup did not save. Try again in a minute." } };
  }
  const delivered = emptyDelivered();
  delivered.store = "dispatched";
  if (parsed.suspect) {
    console.warn(`[capture] honeypot field filled; ${parsed.source} signup held under suspect/`);
    return { status: 200, body: { ok: true, email: "off", delivered } };
  }
  const ms = deps.timeoutMs ?? LEG_TIMEOUT_MS;
  let email: NotifyOutcome = "off";
  if (parsed.download && deps.notify) {
    try {
      email = await withTimeout(deps.notify(parsed.download, first), ms);
    } catch (err) {
      email = "failed";
      console.error("[capture] email leg failed:", err instanceof Error ? err.message : err);
    }
    if (email === "sent") delivered.email = "dispatched";
  }
  const record: CaptureRecord = { ...parsed.record, at };
  for (const leg of ["analytics", "slack"] as const) {
    const send = deps[leg];
    if (!send) continue;
    const work = withTimeout(Promise.resolve().then(() => send(record)), ms).catch((err: unknown) => {
      console.error(`[capture] ${leg} leg failed:`, err instanceof Error ? err.message : err);
    });
    deps.defer?.(work);
    delivered[leg] = "dispatched";
  }
  return { status: 200, body: { ok: true, email, delivered } };
}
