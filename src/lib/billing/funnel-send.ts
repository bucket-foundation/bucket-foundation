import type { FunnelBillingStep } from "./polingual-checkout";
import { claimFunnelPaid } from "./entitlement-store";

export interface FunnelSenderConfig {
  site: string;
  key: string | null;
  post: (url: string, init: RequestInit) => Promise<Response>;
  log: (message: string, detail?: unknown) => void;
}

export function funnelSender(cfg: FunnelSenderConfig): (visitor: string, name: FunnelBillingStep) => Promise<void> {
  let warnedKey = false;
  const site = cfg.site.replace(/\/$/, "");
  return async (visitor, name) => {
    if (!cfg.key && !warnedKey) {
      warnedKey = true;
      cfg.log("polingual funnel: POLINGUAL_FUNNEL_KEY unset, billing events may be rejected");
    }
    try {
      const res = await cfg.post(`${site}/api/events`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://www.polingual.com", ...(cfg.key ? { "x-polingual-funnel-key": cfg.key } : {}) },
        body: JSON.stringify({ visitor, events: [{ name, path: "/billing" }] }),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) cfg.log(`polingual funnel: ${name} answered ${res.status}`);
    } catch (e) {
      cfg.log(`polingual funnel: ${name} send failed`, e instanceof Error ? e.message : e);
    }
  };
}

export function paidClaimer(insert: (userId: string) => Promise<boolean>, log: (message: string, detail?: unknown) => void): (userId: string) => Promise<boolean> {
  let warned = false;
  return async (userId) => {
    try {
      return await insert(userId);
    } catch (e) {
      if (!warned) {
        warned = true;
        log("polingual funnel: paid claim store failed, falling back to status transitions", e instanceof Error ? e.message : e);
      }
      return true;
    }
  };
}

const logError = (message: string, detail?: unknown) => console.error(message, detail ?? "");

export const sendBillingFunnel = funnelSender({
  site: process.env.POLINGUAL_SITE_URL ?? "https://www.polingual.com",
  key: process.env.POLINGUAL_FUNNEL_KEY?.trim() || null,
  post: (url, init) => fetch(url, init),
  log: logError,
});

export const claimPaidOnce = paidClaimer(claimFunnelPaid, logError);
