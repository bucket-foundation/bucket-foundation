import type { StoreEventKind } from "./notifications";

export interface EntitlementEvent {
  kind: StoreEventKind;
  productId: string | null;
  originalTransactionId: string | null;
  signedAt: string;
  expiresAt: string | null;
}

export interface Entitlement {
  active: boolean;
  productId: string | null;
  expiresAt: string | null;
  trial: boolean;
}

const ENDED: ReadonlySet<StoreEventKind> = new Set<StoreEventKind>(["refund", "revoke", "expire"]);
const LIVE: ReadonlySet<StoreEventKind> = new Set<StoreEventKind>(["trial", "subscribe", "renew", "cancel", "uncancel", "refund_reversed", "billing_issue"]);

export const NO_ENTITLEMENT: Entitlement = { active: false, productId: null, expiresAt: null, trial: false };

export function entitlementFrom(events: EntitlementEvent[], now: number): Entitlement {
  const latest = new Map<string, EntitlementEvent>();
  for (const e of events) {
    if (e.kind === "other") continue;
    const key = e.originalTransactionId ?? e.productId ?? "";
    const prev = latest.get(key);
    if (!prev || Date.parse(e.signedAt) >= Date.parse(prev.signedAt)) latest.set(key, e);
  }
  let best: Entitlement = NO_ENTITLEMENT;
  for (const e of Array.from(latest.values())) {
    if (ENDED.has(e.kind) || !LIVE.has(e.kind)) continue;
    const exp = e.expiresAt ? Date.parse(e.expiresAt) : Infinity;
    if (!(exp > now)) continue;
    const bestExp = best.active ? (best.expiresAt ? Date.parse(best.expiresAt) : Infinity) : -Infinity;
    if (exp > bestExp) best = { active: true, productId: e.productId, expiresAt: e.expiresAt, trial: e.kind === "trial" };
  }
  return best;
}
