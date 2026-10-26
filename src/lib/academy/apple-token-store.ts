import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appleKeyFromEnv, encKeyFromEnv, type AppleTokenDeps } from "./apple-token";

let client: SupabaseClient | null = null;
const db = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);

const must = (label: string, error: { message: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message}`);
};

export function appleTokenDeps(): AppleTokenDeps {
  return {
    key: () => appleKeyFromEnv(process.env),
    encKey: () => encKeyFromEnv(process.env.APPLE_TOKEN_ENC_KEY),
    fetch: (url, init) => fetch(url, init),
    nowSeconds: () => Math.floor(Date.now() / 1000),
    log: (event, fields) => console.log(`[apple] ${event}`, JSON.stringify(fields)),
    alert: (message) => console.error(`[apple] ALERT ${message}`),
    save: async (userId, t) => must("apple token save", (await db().from("apple_tokens").upsert({ user_id: userId, client_id: t.clientId, refresh_token_enc: t.sealed, updated_at: new Date().toISOString() })).error),
    list: async (userId) => {
      const { data, error } = await db().from("apple_tokens").select("client_id, refresh_token_enc").eq("user_id", userId);
      must("apple token list", error);
      return (data ?? []).map((r) => ({ clientId: r.client_id as string, sealed: r.refresh_token_enc as string }));
    },
    remove: async (userId, clientId) => must("apple token remove", (await db().from("apple_tokens").delete().eq("user_id", userId).eq("client_id", clientId)).error),
    addPending: async (t, reason) => must("apple pending add", (await db().from("apple_revoke_pending").insert({ client_id: t.clientId, refresh_token_enc: t.sealed, last_error: reason })).error),
    listPending: async (limit) => {
      const { data, error } = await db().from("apple_revoke_pending").select("id, client_id, refresh_token_enc, attempts").eq("status", "pending").order("updated_at").limit(limit);
      must("apple pending list", error);
      return (data ?? []).map((r) => ({ id: r.id as number, clientId: r.client_id as string, sealed: r.refresh_token_enc as string, attempts: r.attempts as number }));
    },
    removePending: async (id) => must("apple pending remove", (await db().from("apple_revoke_pending").delete().eq("id", id)).error),
    bumpPending: async (id, reason, failed) => must("apple pending bump", (await db().rpc("apple_revoke_pending_bump", { p_id: id, p_reason: reason, p_failed: failed })).error),
  };
}
