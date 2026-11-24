import type { FunnelBillingStep } from "./polingual-checkout";

export async function sendBillingFunnel(visitor: string, name: FunnelBillingStep): Promise<void> {
  const site = (process.env.POLINGUAL_SITE_URL ?? "https://www.polingual.com").replace(/\/$/, "");
  const key = process.env.POLINGUAL_FUNNEL_KEY?.trim();
  await fetch(`${site}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.polingual.com", ...(key ? { "x-polingual-funnel-key": key } : {}) },
    body: JSON.stringify({ visitor, events: [{ name, path: "/billing" }] }),
    signal: AbortSignal.timeout(1500),
  });
}
