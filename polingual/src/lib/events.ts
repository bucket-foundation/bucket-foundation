import { allowedSource, RateLimiter, type BetaEnv, type Fetcher } from "./beta";

export const EVENT_NAMES = ["page_view", "beta_open", "beta_signup", "founding_claim", "testflight_open", "share"] as const;
export type EventName = (typeof EVENT_NAMES)[number];
export const MAX_EVENTS = 20;
export const EVENTS_TIMEOUT_MS = 1500;

export type WebEvent = {
  visitor: string;
  name: EventName;
  path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_host: string | null;
  lang: string | null;
};

export type EventsRequest = { origin?: string | null; referer?: string | null; ip?: string | null; country?: string | null; now?: number };
export type EventsResult = { status: number; body: { ok?: true; stored?: number; error?: string } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG = /[^a-z0-9_.-]/g;

export const eventsLimiter = new RateLimiter(120, 60_000);

function tag(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const out = v.toLowerCase().replace(TAG, "").slice(0, max);
  return out || null;
}

function path(v: unknown): string | null {
  if (typeof v !== "string" || !v.startsWith("/")) return null;
  return v.split(/[?#]/)[0].slice(0, 200);
}

function host(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  try {
    return new URL(v).hostname.slice(0, 120) || null;
  } catch {
    return null;
  }
}

export function parseEvents(body: unknown): WebEvent[] | null {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (typeof b.visitor !== "string" || !UUID.test(b.visitor) || !Array.isArray(b.events)) return null;
  const visitor = b.visitor.toLowerCase();
  const out: WebEvent[] = [];
  for (const raw of b.events.slice(0, MAX_EVENTS)) {
    const e = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    if (!(EVENT_NAMES as readonly unknown[]).includes(e.name)) continue;
    out.push({
      visitor,
      name: e.name as EventName,
      path: path(e.path),
      utm_source: tag(e.utm_source, 80),
      utm_medium: tag(e.utm_medium, 80),
      utm_campaign: tag(e.utm_campaign, 80),
      referrer_host: host(e.referrer),
      lang: tag(e.lang, 8),
    });
  }
  return out;
}

export function eventsConfigured(env: BetaEnv): boolean {
  return Boolean(env.POLINGUAL_DB_URL?.trim() && env.POLINGUAL_DB_SERVICE_KEY?.trim());
}

export async function recordEvents(body: unknown, env: BetaEnv, send: Fetcher, req: EventsRequest): Promise<EventsResult> {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Events come from polingual.com." } };
  if (!eventsLimiter.take(req.ip || "unknown", req.now)) return { status: 429, body: { error: "Too many events." } };
  const events = parseEvents(body);
  if (!events) return { status: 400, body: { error: "Send a visitor id and an events list." } };
  if (!events.length) return { status: 200, body: { ok: true, stored: 0 } };
  if (!eventsConfigured(env)) return { status: 503, body: { error: "Event storage is offline." } };
  const key = env.POLINGUAL_DB_SERVICE_KEY!.trim();
  const country = tag(req.country, 2);
  try {
    const r = await send(`${env.POLINGUAL_DB_URL!.trim()}/rest/v1/rpc/record_polingual_web_events`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_events: events, p_country: country }),
      signal: AbortSignal.timeout(EVENTS_TIMEOUT_MS),
    });
    if (!r.ok) return { status: 502, body: { error: "Event storage refused the batch." } };
    return { status: 200, body: { ok: true, stored: Number(await r.json()) || 0 } };
  } catch {
    return { status: 502, body: { error: "Event storage did not answer." } };
  }
}
