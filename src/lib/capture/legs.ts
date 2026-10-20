import type { CaptureRecord } from "./core";
import type { CaptureLegSend } from "./handler";

type Env = Record<string, string | undefined>;
type Fetch = (url: string, init: RequestInit) => Promise<Response>;
type Track = (event: string, props: Record<string, string | boolean | null>) => Promise<unknown>;

export const CAPTURE_EVENT = "capture";

export function captureEventProps(r: CaptureRecord): Record<string, string | boolean | null> {
  return { source: r.source, persona: r.persona, learning: r.learning, release_notes: r.opt_ins.release_notes, whats_new_daily: r.opt_ins.whats_new_daily };
}

export function slackText(r: CaptureRecord): string {
  const parts = [`New ${r.source} signup`];
  if (r.persona) parts.push(`persona ${r.persona}`);
  if (r.speaks || r.learning) parts.push(`speaks ${r.speaks ?? "?"}, learning ${r.learning ?? "?"}`);
  return parts.join(", ");
}

export function analyticsLeg(env: Env, track: Track): CaptureLegSend | undefined {
  if (!env.VERCEL_ENV?.trim() || env.CAPTURE_ANALYTICS === "0") return undefined;
  return (r) => track(CAPTURE_EVENT, captureEventProps(r));
}

export function slackLeg(env: Env, fetcher: Fetch = fetch): CaptureLegSend | undefined {
  const url = env.CAPTURE_SLACK_WEBHOOK_URL?.trim();
  if (!url || !url.startsWith("https://hooks.slack.com/")) return undefined;
  return async (r) => {
    const res = await fetcher(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: slackText(r) }) });
    if (!res.ok) throw new Error(`slack responded ${res.status}`);
  };
}

const POLINGUAL_ORIGINS = ["https://polingual.com", "https://www.polingual.com"];

export function allowedOrigin(origin: string | null, env: Env = process.env): string | null {
  if (!origin) return null;
  const extra = (env.CAPTURE_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if ([...POLINGUAL_ORIGINS, ...extra].includes(origin)) return origin;
  if (!env.VERCEL_ENV && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

export function vercelDefer(work: Promise<unknown>): void {
  const ctx = (globalThis as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[Symbol.for("@vercel/request-context")];
  ctx?.get?.()?.waitUntil?.(work);
}
