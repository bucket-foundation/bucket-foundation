import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { markTrialUsed, readEntitlementState } from "./entitlement-store";
import type { PlayDeps, PlayEntitlement, PlayGoogle, PlayRow, PlayStore } from "./play";
import { claimPaidOnce, sendBillingFunnel } from "./funnel-send";
import { googlePlayClient, serviceAccount } from "./play-google";

let bucket: SupabaseClient | null = null;
const client = (): SupabaseClient =>
  (bucket ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);

export const supabasePlayStore: PlayStore = {
  row: async (token) => {
    const { data, error } = await client().from("play_purchases").select("*").eq("purchase_token", token).maybeSingle();
    if (error) throw new Error(`play_purchases read failed: ${error.message}`);
    return (data as PlayRow | null) ?? null;
  },
  save: async (row) => {
    const { error } = await client().from("play_purchases").upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "purchase_token" });
    return !error;
  },
  forUser: async (userId) => {
    const { data, error } = await client().from("play_purchases").select("*").eq("user_id", userId);
    if (error) throw new Error(`play_purchases read failed: ${error.message}`);
    return (data as PlayRow[] | null) ?? [];
  },
  replace: async (token) => {
    await client().from("play_purchases").update({ state: "replaced", updated_at: new Date().toISOString() }).eq("purchase_token", token);
  },
};

async function recordPlayEntitlement(e: PlayEntitlement): Promise<boolean> {
  const { error } = await client()
    .from("academy_entitlements")
    .upsert({ ...e, product: "polingual", updated_at: new Date().toISOString() }, { onConflict: "user_id,product" });
  return !error;
}

let google: PlayGoogle | null | undefined;
function playGoogle(): PlayGoogle | null {
  if (google !== undefined) return google;
  const sa = serviceAccount(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  google = sa ? googlePlayClient(sa, process.env.GOOGLE_PLAY_API_BASE ?? "https://androidpublisher.googleapis.com") : null;
  return google;
}

export function playDeps(): PlayDeps {
  return {
    google: playGoogle,
    store: supabasePlayStore,
    current: (uid) => readEntitlementState(uid, "polingual"),
    record: recordPlayEntitlement,
    markTrial: (uid) => markTrialUsed(uid, "play"),
    funnel: sendBillingFunnel,
    claimPaid: claimPaidOnce,
    now: Date.now,
  };
}
