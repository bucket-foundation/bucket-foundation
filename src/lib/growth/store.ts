import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configured } from "@/lib/research-os/db";
import { parseSnapshot, type GrowthSnapshot } from "./snapshot";

export interface SnapshotStore {
  latest: () => Promise<GrowthSnapshot | null>;
  save: (snap: GrowthSnapshot) => Promise<void>;
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

export function supabaseSnapshotStore(): SnapshotStore | null {
  if (!configured()) return null;
  return {
    latest: async () => {
      const { data, error } = await client().from("growth_snapshots").select("data").order("taken_at", { ascending: false }).limit(1);
      if (error) throw new Error(`growth_snapshots read failed: ${error.message}`);
      if (!data || data.length === 0) return null;
      const parsed = parseSnapshot((data[0] as { data: unknown }).data);
      if (!parsed.ok) throw new Error(`growth_snapshots row invalid: ${parsed.error}`);
      return parsed.value;
    },
    save: async (snap) => {
      const { error } = await client().from("growth_snapshots").insert({ taken_at: snap.takenAt, data: snap });
      if (error) throw new Error(`growth_snapshots insert failed: ${error.message}`);
    },
  };
}
