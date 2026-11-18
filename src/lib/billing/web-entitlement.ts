import type { Entitlement } from "@/lib/app-store/entitlement";
import { ACTIVE_STATUSES } from "./polingual-checkout";

export interface WebEntitlementRow {
  status: string;
  plan: string | null;
  current_period_end: string | null;
}

export function webProductId(plan: string | null): string {
  return `web.polingual.${(plan ?? "membership").replace(/[^a-z0-9]+/gi, ".").toLowerCase()}`;
}

export function withWebEntitlement(appStore: Entitlement, row: WebEntitlementRow | null | undefined, now: number): Entitlement {
  if (appStore.active || !row || !ACTIVE_STATUSES.has(row.status)) return appStore;
  if (row.current_period_end !== null && !(Date.parse(row.current_period_end) > now)) return appStore;
  return { active: true, productId: webProductId(row.plan), expiresAt: row.current_period_end, trial: row.status === "trialing" };
}

export function webEntitlementsOn(env: Record<string, string | undefined>, storeReady: boolean): boolean {
  return storeReady && Boolean(env.STRIPE_SECRET_KEY?.trim());
}
