import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isLifetime, type Entitlement, type EntitlementPatch, type EntitlementState } from "./polingual-checkout";

let bucket: SupabaseClient | null = null;

export function entitlementStoreConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client(): SupabaseClient {
  return (bucket ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);
}

export async function recordEntitlement(e: Entitlement): Promise<boolean> {
  const row: Record<string, unknown> = { ...e, updated_at: new Date().toISOString() };
  if (e.current_period_end === null && !isLifetime(e)) delete row.current_period_end;
  if (e.stripe_subscription === null) delete row.stripe_subscription;
  if (e.last_event_id === null) delete row.last_event_id;
  if (e.last_event_at === null) delete row.last_event_at;
  const { error } = await client().from("academy_entitlements").upsert(row, { onConflict: "user_id,product" });
  return !error;
}

export async function readEntitlement(userId: string, product: string): Promise<Entitlement | null> {
  const { data, error } = await client()
    .from("academy_entitlements")
    .select("user_id,product,status,plan,current_period_end")
    .eq("user_id", userId)
    .eq("product", product)
    .maybeSingle();
  if (error) throw new Error(`academy_entitlements read failed: ${error.message}`);
  return (data as Entitlement | null) ?? null;
}

export async function readStripeCustomer(userId: string, product: string): Promise<string | null> {
  const { data, error } = await client().from("academy_entitlements").select("stripe_customer").eq("user_id", userId).eq("product", product).maybeSingle();
  if (error) throw new Error(`academy_entitlements read failed: ${error.message}`);
  const c = (data as { stripe_customer?: unknown } | null)?.stripe_customer;
  return typeof c === "string" && c ? c : null;
}

const STATE_COLUMNS = "user_id,status,stripe_subscription,last_event_id,last_event_at";

export async function readEntitlementState(userId: string, product: string): Promise<EntitlementState | null> {
  const { data, error } = await client().from("academy_entitlements").select(STATE_COLUMNS).eq("user_id", userId).eq("product", product).maybeSingle();
  if (error) throw new Error(`academy_entitlements read failed: ${error.message}`);
  return (data as EntitlementState | null) ?? null;
}

export async function readEntitlementByCustomer(customer: string, product: string): Promise<EntitlementState | null> {
  const { data, error } = await client().from("academy_entitlements").select(STATE_COLUMNS).eq("stripe_customer", customer).eq("product", product).limit(1).maybeSingle();
  if (error) throw new Error(`academy_entitlements read failed: ${error.message}`);
  return (data as EntitlementState | null) ?? null;
}

export async function patchEntitlement(userId: string, product: string, p: EntitlementPatch): Promise<boolean> {
  const { error } = await client().from("academy_entitlements").update({ ...p, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("product", product);
  return !error;
}

export async function readTrialFlag(userId: string): Promise<"web" | "app_store" | "play" | null> {
  const { data, error } = await client().from("polingual_trial_used").select("store").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`polingual_trial_used read failed: ${error.message}`);
  return ((data as { store?: "web" | "app_store" | "play" } | null)?.store ?? null);
}

export async function markTrialUsed(userId: string, store: "web" | "app_store" | "play"): Promise<void> {
  const { error } = await client().from("polingual_trial_used").upsert({ user_id: userId, store }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new Error(`polingual_trial_used write failed: ${error.message}`);
}

export async function claimFunnelPaid(userId: string): Promise<boolean> {
  const { data, error } = await client().from("polingual_funnel_paid").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true }).select("user_id");
  if (error) throw new Error(`polingual_funnel_paid write failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

export async function offerUsed(userId: string, offer: "winback"): Promise<boolean> {
  const { data, error } = await client().from("polingual_offer_used").select("offer").eq("user_id", userId).eq("offer", offer).maybeSingle();
  if (error) throw new Error(`polingual_offer_used read failed: ${error.message}`);
  return data !== null;
}

export async function markOfferUsed(userId: string, offer: "winback"): Promise<void> {
  const { error } = await client().from("polingual_offer_used").upsert({ user_id: userId, offer }, { onConflict: "user_id,offer", ignoreDuplicates: true });
  if (error) throw new Error(`polingual_offer_used write failed: ${error.message}`);
}

export async function reserveOffer(userId: string, offer: "winback"): Promise<boolean> {
  const { data, error } = await client().from("polingual_offer_used").upsert({ user_id: userId, offer }, { onConflict: "user_id,offer", ignoreDuplicates: true }).select("offer");
  if (error) throw new Error(`polingual_offer_used reserve failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

export async function releaseOffer(userId: string, offer: "winback"): Promise<void> {
  const { error } = await client().from("polingual_offer_used").delete().eq("user_id", userId).eq("offer", offer);
  if (error) throw new Error(`polingual_offer_used release failed: ${error.message}`);
}
