import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredTranslationReport, TranslationReportStore } from "./translation-report";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const configured = () => Boolean(url() && process.env.SUPABASE_SERVICE_ROLE_KEY);
let bucket: SupabaseClient | null = null;
const bucketClient = () =>
  (bucket ??= createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);

export const REPORT_COLUMNS = "id, lang, root, item_id, text, shown, reason, suggestion, context, user_id, device_id, created_at";

export function supabaseTranslationReportStore(): TranslationReportStore | null {
  if (!configured()) return null;
  return {
    hit: async (key, limit, windowSeconds) => {
      const { data, error } = await bucketClient().rpc("session_rate_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
      if (error) throw new Error(`translation report rate: ${error.message}`);
      return data === true;
    },
    insert: async (row) => {
      const { data, error } = await bucketClient().from("translation_reports").upsert(row, { onConflict: "id", ignoreDuplicates: true }).select("id");
      if (error) throw new Error(`translation report insert: ${error.message}`);
      return (data ?? []).length === 0 ? "duplicate" : "recorded";
    },
  };
}

export async function listTranslationReports(limit: number): Promise<StoredTranslationReport[] | null> {
  if (!configured()) return null;
  const { data, error } = await bucketClient().from("translation_reports").select(REPORT_COLUMNS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`translation reports read: ${error.message}`);
  return (data ?? []) as StoredTranslationReport[];
}
