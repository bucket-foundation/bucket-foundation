import { createHash } from "node:crypto";
import type { BetaEnv, Fetcher } from "./beta";

export type Utm = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;

export type Conversion = {
  eventId: string;
  email: string;
  ip: string | null;
  userAgent: string | null;
  url: string;
  fbp?: string;
  fbc?: string;
  ttclid?: string;
  utm?: Utm;
  now?: number;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const EVENT_ID = /^[A-Za-z0-9-]{8,64}$/;

export function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function cleanUtm(raw: unknown): Utm {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Utm = {};
  for (const k of UTM_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 100);
  }
  return out;
}

export function conversionFromBody(body: unknown): { eventId: string; utm: Utm; fbp?: string; fbc?: string; ttclid?: string } | null {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (b.consent !== true || typeof b.event_id !== "string" || !EVENT_ID.test(b.event_id)) return null;
  const str = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : undefined);
  return { eventId: b.event_id, utm: cleanUtm(b.utm), fbp: str(b.fbp), fbc: str(b.fbc), ttclid: str(b.ttclid) };
}

export function metaEvent(c: Conversion) {
  return {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor((c.now ?? Date.now()) / 1000),
        event_id: c.eventId,
        action_source: "website",
        event_source_url: c.url,
        user_data: { em: [sha256(c.email)], client_ip_address: c.ip ?? undefined, client_user_agent: c.userAgent ?? undefined, fbp: c.fbp, fbc: c.fbc },
        custom_data: { ...c.utm },
      },
    ],
  };
}

export function tiktokEvent(pixel: string, c: Conversion) {
  return {
    event_source: "web",
    event_source_id: pixel,
    data: [
      {
        event: "CompleteRegistration",
        event_time: Math.floor((c.now ?? Date.now()) / 1000),
        event_id: c.eventId,
        user: { email: sha256(c.email), ip: c.ip ?? undefined, user_agent: c.userAgent ?? undefined, ttclid: c.ttclid },
        page: { url: c.url },
        properties: { ...c.utm },
      },
    ],
  };
}

export async function sendConversions(env: BetaEnv, c: Conversion, send: Fetcher = fetch): Promise<string[]> {
  const jobs: { name: string; run: () => Promise<Response> }[] = [];
  const metaPixel = env.META_PIXEL_ID?.trim();
  const metaToken = env.META_CAPI_TOKEN?.trim();
  if (metaPixel && metaToken) {
    jobs.push({
      name: "meta",
      run: () =>
        send(`https://graph.facebook.com/v21.0/${encodeURIComponent(metaPixel)}/events?access_token=${encodeURIComponent(metaToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metaEvent(c)),
        }),
    });
  }
  const ttPixel = env.TIKTOK_PIXEL_ID?.trim();
  const ttToken = env.TIKTOK_EVENTS_TOKEN?.trim();
  if (ttPixel && ttToken) {
    jobs.push({
      name: "tiktok",
      run: () =>
        send("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Access-Token": ttToken },
          body: JSON.stringify(tiktokEvent(ttPixel, c)),
        }),
    });
  }
  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected" || !r.value.ok) failed.push(jobs[i].name);
  });
  if (failed.length) console.error("[ads] conversion api failed", failed.join(","));
  return jobs.map((j) => j.name).filter((n) => !failed.includes(n));
}

export function pixelIds(env: BetaEnv): { meta: string | null; tiktok: string | null } {
  const ok = (v?: string) => (v && /^[A-Za-z0-9]{6,32}$/.test(v.trim()) ? v.trim() : null);
  return { meta: ok(env.META_PIXEL_ID), tiktok: ok(env.TIKTOK_PIXEL_ID) };
}
