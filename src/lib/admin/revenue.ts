import type { StoreEventKind } from "@/lib/app-store/notifications";
import { isSandbox } from "@/lib/app-store/store";
import { BUNDLE_APPS, type AdminApp } from "./users";

export interface RevenueEventRow {
  kind: StoreEventKind;
  productId: string | null;
  bundleId: string | null;
  environment: string | null;
  originalTransactionId: string | null;
  signedAt: string;
  expiresAt: string | null;
  priceMilli: number | null;
  currency: string | null;
}

export interface AppRevenue {
  app: AdminApp;
  mrr: Record<string, number>;
  activeSubscriptions: number;
  trials: number;
  trialsConverted: number;
  trialToPaid: number | null;
  refunds: number;
  planMix: { productId: string; active: number }[];
}

export interface RevenueSummary {
  windowDays: number;
  apps: AppRevenue[];
  sandboxSkipped: number;
}

const PAID_KINDS = new Set<StoreEventKind>(["subscribe", "renew", "uncancel", "refund_reversed"]);
export const UNKNOWN_CURRENCY = "unknown currency";
const ENDING_KINDS = new Set<StoreEventKind>(["expire", "refund", "revoke"]);

export function monthlyFactor(productId: string | null): number {
  const p = (productId ?? "").toLowerCase();
  if (/(year|annual)/.test(p)) return 1 / 12;
  if (/week/.test(p)) return 52 / 12;
  if (/(quarter|3m)/.test(p)) return 1 / 3;
  return 1;
}

function appOf(bundleId: string | null): AdminApp {
  return (bundleId && BUNDLE_APPS[bundleId]) || "unknown";
}

export function summarizeRevenue(rows: RevenueEventRow[], windowDays: number, now: Date = new Date()): RevenueSummary {
  const byApp = new Map<AdminApp, RevenueEventRow[]>();
  let sandboxSkipped = 0;
  for (const r of rows) {
    if (isSandbox(r.environment)) {
      sandboxSkipped++;
      continue;
    }
    const app = appOf(r.bundleId);
    const list = byApp.get(app) ?? [];
    list.push(r);
    byApp.set(app, list);
  }
  const apps: AppRevenue[] = [];
  for (const [app, list] of Array.from(byApp.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = [...list].sort((a, b) => a.signedAt.localeCompare(b.signedAt));
    const chains = new Map<string, RevenueEventRow[]>();
    for (const r of sorted) {
      const key = r.originalTransactionId ?? `solo:${r.signedAt}:${r.productId}`;
      const c = chains.get(key) ?? [];
      c.push(r);
      chains.set(key, c);
    }
    const mrr: Record<string, number> = {};
    const mix = new Map<string, number>();
    let active = 0;
    let trials = 0;
    let converted = 0;
    for (const chain of Array.from(chains.values())) {
      const trialAt = chain.findIndex((r) => r.kind === "trial");
      if (trialAt >= 0) {
        trials++;
        if (chain.slice(trialAt + 1).some((r) => PAID_KINDS.has(r.kind))) converted++;
      }
      const last = chain[chain.length - 1];
      const lastPaid = [...chain].reverse().find((r) => PAID_KINDS.has(r.kind));
      const live = !ENDING_KINDS.has(last.kind) && last.kind !== "trial" && lastPaid && (!lastPaid.expiresAt || Date.parse(lastPaid.expiresAt) > now.getTime());
      if (!live || !lastPaid) continue;
      active++;
      const product = lastPaid.productId ?? "unknown";
      mix.set(product, (mix.get(product) ?? 0) + 1);
      if (lastPaid.priceMilli !== null) {
        const cur = lastPaid.currency ?? UNKNOWN_CURRENCY;
        const monthly = (lastPaid.priceMilli / 1000) * monthlyFactor(lastPaid.productId);
        mrr[cur] = Math.round(((mrr[cur] ?? 0) + monthly) * 100) / 100;
      }
    }
    apps.push({
      app,
      mrr,
      activeSubscriptions: active,
      trials,
      trialsConverted: converted,
      trialToPaid: trials === 0 ? null : converted / trials,
      refunds: list.filter((r) => r.kind === "refund").length,
      planMix: Array.from(mix.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([productId, n]) => ({ productId, active: n })),
    });
  }
  return { windowDays, apps, sandboxSkipped };
}

export interface StoredRevenueRow {
  kind: StoreEventKind;
  product_id: string | null;
  bundle_id: string | null;
  environment: string | null;
  original_transaction_id: string | null;
  signed_at: string;
  expires_at: string | null;
  transaction_info: Record<string, unknown>;
  renewal_info: Record<string, unknown>;
}

export function toRevenueRow(r: StoredRevenueRow): RevenueEventRow {
  const tx = r.transaction_info ?? {};
  const renewal = r.renewal_info ?? {};
  const currency = typeof tx.currency === "string" ? tx.currency : typeof renewal.currency === "string" ? renewal.currency : null;
  return {
    kind: r.kind,
    productId: r.product_id,
    bundleId: r.bundle_id,
    environment: r.environment,
    originalTransactionId: r.original_transaction_id,
    signedAt: r.signed_at,
    expiresAt: r.expires_at,
    priceMilli: typeof tx.price === "number" ? tx.price : null,
    currency,
  };
}
