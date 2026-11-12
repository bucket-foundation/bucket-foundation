import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configured } from "@/lib/research-os/db";

export interface EntitlementStore {
  isFoundingTester: (userId: string) => Promise<boolean>;
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

export function supabaseEntitlementStore(): EntitlementStore | null {
  if (!configured()) return null;
  return {
    isFoundingTester: async (userId) => {
      const { data, error } = await client().rpc("is_founding_tester", { p_user: userId });
      if (error) throw new Error(`is_founding_tester failed: ${error.message}`);
      return data === true;
    },
  };
}
