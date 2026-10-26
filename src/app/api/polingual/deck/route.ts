import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { createDeckHandler, type DeckCard } from "@/lib/polingual/deck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
let bucket: SupabaseClient | null = null;
const bucketClient = () =>
  (bucket ??= createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);

const COLUMNS = "surface,lang,meaning_en,ipa,source_surface,source_lang,deck";

function handlerFor(req: NextRequest) {
  return createDeckHandler({
    configured: () => Boolean(URL_() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    verifyUser: async () => (await verifyRequestUser(req))?.id ?? null,
    rateHit: async (key, limit, windowSeconds) => {
      const { data, error } = await bucketClient().rpc("session_rate_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
      if (error) throw new Error(`deck rate: ${error.message}`);
      return data === true;
    },
    save: async (userId, card) => {
      const { data, error } = await bucketClient()
        .from("polingual_deck_cards")
        .upsert({ user_id: userId, ...card }, { onConflict: "user_id,deck,lang,surface", ignoreDuplicates: true })
        .select("surface");
      if (error) return { ok: false };
      return { ok: true, duplicate: (data ?? []).length === 0 };
    },
    list: async (userId, deck) => {
      let q = bucketClient().from("polingual_deck_cards").select(COLUMNS).eq("user_id", userId);
      if (deck) q = q.eq("deck", deck);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
      return error ? null : ((data ?? []) as DeckCard[]);
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const r = await handlerFor(req).save(await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual deck save", e);
    return jsonResponse({ error: "save_failed" }, 502);
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const r = await handlerFor(req).list(new URL(req.url).searchParams.get("deck"));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual deck list", e);
    return jsonResponse({ error: "read_failed" }, 502);
  }
}
