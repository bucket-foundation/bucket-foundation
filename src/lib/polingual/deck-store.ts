import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { createDeckHandler, type DeckCard } from "./deck";

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
let bucket: SupabaseClient | null = null;
const bucketClient = () =>
  (bucket ??= createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);

const COLUMNS = "surface,lang,meaning_en,ipa,source_surface,source_lang,deck";

export function deckHandlerFor(req: NextRequest) {
  return createDeckHandler({
    configured: () => Boolean(URL_() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    verifyUser: async () => (await verifyRequestUser(req))?.id ?? null,
    rateHit: async (key, limit, windowSeconds) => {
      const { data, error } = await bucketClient().rpc("session_rate_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
      if (error) throw new Error(`deck rate: ${error.message}`);
      return data === true;
    },
    count: async (userId) => {
      const { count, error } = await bucketClient().from("polingual_deck_cards").select("surface", { count: "exact", head: true }).eq("user_id", userId);
      if (error) console.error("polingual deck count", error.message);
      return error ? null : (count ?? 0);
    },
    save: async (userId, card) => {
      const { data, error } = await bucketClient()
        .from("polingual_deck_cards")
        .upsert({ user_id: userId, ...card }, { onConflict: "user_id,deck,lang,surface", ignoreDuplicates: true })
        .select("surface");
      if (error) {
        console.error("polingual deck save", error.message);
        return { ok: false };
      }
      return { ok: true, duplicate: (data ?? []).length === 0 };
    },
    list: async (userId, deck) => {
      let q = bucketClient().from("polingual_deck_cards").select(COLUMNS).eq("user_id", userId);
      if (deck) q = q.eq("deck", deck);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
      if (error) console.error("polingual deck list", error.message);
      return error ? null : ((data ?? []) as DeckCard[]);
    },
  });
}

