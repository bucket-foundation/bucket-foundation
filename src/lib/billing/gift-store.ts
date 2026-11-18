import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { entitlementStoreConfigured } from "./entitlement-store";
import { giftCodeHash, giftMailConfig, type GiftEmail, type GiftLocale, type GiftMailConfig, type GiftRow, type GiftStore, type RedeemOutcome } from "./polingual-gift";

let bucket: SupabaseClient | null = null;

function client(): SupabaseClient {
  return (bucket ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);
}

const COLUMNS = "id,stripe_event_id,stripe_session_id,buyer_email,recipient_email,recipient_name,note,deliver_on,locale,amount_total,currency,code,expires_at,receipt_sent_at,delivered_at,redeemed_at";

interface DbGift {
  id: string;
  stripe_event_id: string;
  stripe_session_id: string;
  buyer_email: string;
  recipient_email: string;
  recipient_name: string;
  note: string | null;
  deliver_on: string;
  locale: string;
  amount_total: number | null;
  currency: string | null;
  code: string | null;
  expires_at: string;
  receipt_sent_at: string | null;
  delivered_at: string | null;
  redeemed_at: string | null;
}

export function giftFromDb(r: DbGift): GiftRow {
  return {
    id: r.id,
    eventId: r.stripe_event_id,
    sessionId: r.stripe_session_id,
    buyerEmail: r.buyer_email,
    recipientEmail: r.recipient_email,
    recipientName: r.recipient_name,
    note: r.note,
    deliverOn: r.deliver_on,
    locale: (r.locale === "es" ? "es" : "en") as GiftLocale,
    amountTotal: r.amount_total,
    currency: r.currency,
    code: r.code,
    expiresAt: r.expires_at,
    receiptSentAt: r.receipt_sent_at,
    deliveredAt: r.delivered_at,
    redeemedAt: r.redeemed_at,
  };
}

const OUTCOMES: readonly RedeemOutcome[] = ["redeemed", "already", "used", "expired", "invalid", "subscribed"];

export function supabaseGiftStore(): GiftStore | null {
  if (!entitlementStoreConfigured()) return null;
  const table = () => client().from("polingual_gifts");
  const stamp = async (id: string, column: "receipt_sent_at" | "delivered_at", at: string) => {
    const { error } = await table().update({ [column]: at }).eq("id", id);
    if (error) throw new Error(`polingual_gifts ${column} update failed: ${error.message}`);
  };
  return {
    record: async (p, code, expiresAt) => {
      const row = {
        stripe_event_id: p.eventId,
        stripe_session_id: p.sessionId,
        buyer_email: p.buyerEmail,
        recipient_email: p.recipientEmail,
        recipient_name: p.recipientName,
        note: p.note,
        deliver_on: p.deliverOn,
        locale: p.locale,
        amount_total: p.amountTotal,
        currency: p.currency,
        code,
        code_hash: giftCodeHash(code),
        expires_at: expiresAt,
      };
      const { error } = await table().upsert(row, { onConflict: "stripe_session_id", ignoreDuplicates: true });
      if (error) throw new Error(`polingual_gifts insert failed: ${error.message}`);
      const { data, error: readError } = await table().select(COLUMNS).eq("stripe_session_id", p.sessionId).single();
      if (readError || !data) throw new Error(`polingual_gifts read failed: ${readError?.message ?? "no row"}`);
      return giftFromDb(data as DbGift);
    },
    markReceipt: (id, at) => stamp(id, "receipt_sent_at", at),
    markDelivered: (id, at) => stamp(id, "delivered_at", at),
    due: async (day, limit) => {
      const { data, error } = await table().select(COLUMNS).is("delivered_at", null).is("redeemed_at", null).not("code", "is", null).lte("deliver_on", day).order("deliver_on").limit(limit);
      if (error) throw new Error(`polingual_gifts due read failed: ${error.message}`);
      return ((data ?? []) as DbGift[]).map(giftFromDb);
    },
    redeem: async (codeHash, userId, at) => {
      const { data, error } = await client().rpc("redeem_polingual_gift", { p_code_hash: codeHash, p_user_id: userId, p_now: at });
      if (error) throw new Error(`redeem_polingual_gift failed: ${error.message}`);
      const row = (Array.isArray(data) ? data[0] : data) as { outcome?: string; access_until?: string | null } | null;
      const outcome = OUTCOMES.find((o) => o === row?.outcome);
      if (!outcome) throw new Error("redeem_polingual_gift returned no outcome");
      return { outcome, until: row?.access_until ?? null };
    },
  };
}

const RESEND_URL = "https://api.resend.com/emails";

export async function sendGiftEmail(config: GiftMailConfig, email: GiftEmail, idempotencyKey: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetcher(RESEND_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({ from: config.from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!res.ok) console.error("[polingual-gift] resend", res.status);
    return res.ok;
  } catch (err) {
    console.error("[polingual-gift] resend unreachable:", err instanceof Error ? err.message : "unknown");
    return false;
  }
}

export function giftFulfilDeps(env: Record<string, string | undefined> = process.env) {
  const mail = giftMailConfig(env);
  return {
    store: supabaseGiftStore,
    site: () => (env.POLINGUAL_SITE_URL ?? "https://www.polingual.com").replace(/\/$/, ""),
    postalAddress: () => mail?.postalAddress ?? null,
    send: async (email: GiftEmail, key: string) => (mail ? sendGiftEmail(mail, email, key) : false),
    now: Date.now,
  };
}
