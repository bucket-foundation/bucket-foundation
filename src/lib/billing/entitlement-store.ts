import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Entitlement } from "./polingual-checkout";

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
  const { error } = await client().from("academy_entitlements").upsert(row, { onConflict: "user_id,product" });
  return !error;
}

export async function readEntitlement(userId: string, product: string): Promise<Entitlement | null | undefined> {
  const { data, error } = await client()
    .from("academy_entitlements")
    .select("user_id,product,status,plan,current_period_end")
    .eq("user_id", userId)
    .eq("product", product)
    .maybeSingle();
  if (error) return undefined;
  return (data as Entitlement | null) ?? null;
}
