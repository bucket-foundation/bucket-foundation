import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Entitlement, EntitlementPatch, EntitlementState } from "./polingual-checkout";

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
  if (e.current_period_end === null) delete row.current_period_end;
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
