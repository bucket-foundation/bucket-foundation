import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configured } from "@/lib/research-os/db";
import type { StoreEvent, StoreEventKind } from "./notifications";

export type SaveOutcome = "recorded" | "duplicate";

export interface StoreEventRow {
  kind: StoreEventKind;
  productId: string | null;
  environment: string | null;
  signedAt: string;
  linked: boolean;
}

export interface AppStoreEventStore {
  save: (e: StoreEvent) => Promise<SaveOutcome>;
  tokenFor: (userId: string) => Promise<string>;
  since: (iso: string) => Promise<StoreEventRow[]>;
}

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _client;
}

function row(e: StoreEvent) {
  return {
    notification_uuid: e.notificationUuid,
    type: e.type,
    subtype: e.subtype,
    kind: e.kind,
    app_account_token: e.appAccountToken,
    bundle_id: e.bundleId,
    environment: e.environment,
    product_id: e.productId,
    transaction_id: e.transactionId,
    original_transaction_id: e.originalTransactionId,
    offer_type: e.offerType,
    signed_at: e.signedAt,
    expires_at: e.expiresAt,
    transaction_info: e.transactionInfo,
    renewal_info: e.renewalInfo,
  };
}

export function supabaseAppStoreEventStore(): AppStoreEventStore | null {
  if (!configured()) return null;
  return {
    save: async (e) => {
      let userId: string | null = null;
      if (e.appAccountToken) {
        const { data: bound, error: bindErr } = await client().from("app_store_account_tokens").select("user_id").eq("token", e.appAccountToken).maybeSingle();
        if (bindErr) throw new Error(`app_store_account_tokens read failed: ${bindErr.message}`);
        userId = (bound as { user_id: string } | null)?.user_id ?? null;
      }
      const { data, error } = await client()
        .from("app_store_events")
        .upsert({ ...row(e), user_id: userId }, { onConflict: "notification_uuid", ignoreDuplicates: true })
        .select("notification_uuid");
      if (error) throw new Error(`app_store_events insert failed: ${error.message}`);
      return (data?.length ?? 0) > 0 ? "recorded" : "duplicate";
    },
    tokenFor: async (userId) => {
      const db = client();
      const { error: insErr } = await db.from("app_store_account_tokens").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
      if (insErr) throw new Error(`app_store_account_tokens insert failed: ${insErr.message}`);
      const { data, error } = await db.from("app_store_account_tokens").select("token").eq("user_id", userId).single();
      if (error || !data) throw new Error(`app_store_account_tokens read failed: ${error?.message ?? "no row"}`);
      return (data as { token: string }).token;
    },
    since: async (iso) => {
      const { data, error } = await client()
        .from("app_store_events")
        .select("kind, product_id, environment, signed_at, user_id")
        .gte("signed_at", iso)
        .order("signed_at")
        .limit(50_000);
      if (error) throw new Error(`app_store_events list failed: ${error.message}`);
      return (data as { kind: StoreEventKind; product_id: string | null; environment: string | null; signed_at: string; user_id: string | null }[]).map((r) => ({
        kind: r.kind,
        productId: r.product_id,
        environment: r.environment,
        signedAt: r.signed_at,
        linked: r.user_id !== null,
      }));
    },
  };
}

export interface StoreSummary {
  windowDays: number;
  totals: Record<StoreEventKind, number>;
  byProduct: { productId: string; counts: Partial<Record<StoreEventKind, number>> }[];
  unlinked: number;
  sandbox: number;
}

export function summarizeStoreEvents(rows: StoreEventRow[], windowDays: number): StoreSummary {
  const totals = { trial: 0, subscribe: 0, renew: 0, cancel: 0, uncancel: 0, refund: 0, refund_reversed: 0, revoke: 0, expire: 0, billing_issue: 0, other: 0 } as Record<StoreEventKind, number>;
  const products = new Map<string, Partial<Record<StoreEventKind, number>>>();
  let unlinked = 0;
  let sandbox = 0;
  for (const r of rows) {
    if (r.environment === "Sandbox") {
      sandbox++;
      continue;
    }
    totals[r.kind]++;
    if (!r.linked) unlinked++;
    const key = r.productId ?? "unknown";
    const c = products.get(key) ?? {};
    c[r.kind] = (c[r.kind] ?? 0) + 1;
    products.set(key, c);
  }
  return {
    windowDays,
    totals,
    byProduct: Array.from(products.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([productId, counts]) => ({ productId, counts })),
    unlinked,
    sandbox,
  };
}
