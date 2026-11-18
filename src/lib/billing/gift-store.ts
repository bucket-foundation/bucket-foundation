import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { entitlementStoreConfigured } from "./entitlement-store";
import { layeredLimiter } from "../capture/handler";
import { rateLimiter } from "../download/handler";
import { getMarkStore, sharedRateLimiter } from "../download/marks";
import { giftConfig, giftMailConfig, type GiftEmail, type GiftLocale, type GiftMailConfig, type GiftRow, type GiftStore, type LineItem, type RedeemOutcome, type VoidReason } from "./polingual-gift";

let bucket: SupabaseClient | null = null;

function client(): SupabaseClient {
  return (bucket ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bucket" },
  }) as unknown as SupabaseClient);
}

const COLUMNS =
  "id,stripe_event_id,stripe_session_id,stripe_payment_intent,paid_at,buyer_email,recipient_email,recipient_name,note,deliver_on,deliver_after,locale,amount_subtotal,amount_total,currency,expires_at,receipt_sent_at,delivered_at,redeemed_at,voided_at,void_reason";

interface DbGift {
  id: string;
  stripe_event_id: string;
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  paid_at: string;
  buyer_email: string;
  recipient_email: string | null;
  recipient_name: string | null;
  note: string | null;
  deliver_on: string;
  deliver_after: string;
  locale: string;
  amount_subtotal: number | null;
  amount_total: number | null;
  currency: string | null;
  expires_at: string;
  receipt_sent_at: string | null;
  delivered_at: string | null;
  redeemed_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export function giftFromDb(r: DbGift): GiftRow {
  return {
    id: r.id,
    eventId: r.stripe_event_id,
    sessionId: r.stripe_session_id,
    paymentIntent: r.stripe_payment_intent,
    paidAt: r.paid_at,
    buyerEmail: r.buyer_email,
    recipientEmail: r.recipient_email,
    recipientName: r.recipient_name,
    note: r.note,
    deliverOn: r.deliver_on,
    deliverAfter: r.deliver_after,
    locale: (r.locale === "es" ? "es" : "en") as GiftLocale,
    amountSubtotal: r.amount_subtotal,
    amountTotal: r.amount_total,
    currency: r.currency,
    expiresAt: r.expires_at,
    receiptSentAt: r.receipt_sent_at,
    deliveredAt: r.delivered_at,
    redeemedAt: r.redeemed_at,
    voidedAt: r.voided_at,
    voidReason: (r.void_reason as VoidReason | null) ?? null,
  };
}

const OUTCOMES: readonly RedeemOutcome[] = ["redeemed", "already", "used", "expired", "invalid", "subscribed", "void"];
const VOID_OUTCOMES = ["voided", "already", "unknown"] as const;

export function supabaseGiftStore(): GiftStore | null {
  if (!entitlementStoreConfigured()) return null;
  const table = () => client().from("polingual_gifts");
  const patch = async (id: string, values: Record<string, string>, guard?: "undelivered") => {
    const q = table().update(values).eq("id", id);
    const { error } = await (guard ? q.is("delivered_at", null).is("redeemed_at", null) : q);
    if (error) throw new Error(`polingual_gifts update failed: ${error.message}`);
  };
  const first = <T>(data: unknown): T | null => ((Array.isArray(data) ? data[0] : data) as T | null) ?? null;
  return {
    record: async (p, expiresAt, deliverAfter, voidReason) => {
      const row = {
        stripe_event_id: p.eventId,
        stripe_session_id: p.sessionId,
        stripe_payment_intent: p.paymentIntent,
        paid_at: p.paidAt,
        buyer_email: p.buyerEmail,
        recipient_email: p.recipientEmail,
        recipient_name: p.recipientName,
        note: p.note,
        deliver_on: p.deliverOn,
        deliver_after: deliverAfter,
        locale: p.locale,
        amount_subtotal: p.amountSubtotal,
        amount_total: p.amountTotal,
        currency: p.currency,
        expires_at: expiresAt,
        ...(voidReason ? { voided_at: p.paidAt, void_reason: voidReason } : {}),
      };
      const { error } = await table().upsert(row, { onConflict: "stripe_session_id", ignoreDuplicates: true });
      if (error) throw new Error(`polingual_gifts insert failed: ${error.message}`);
      const { data, error: readError } = await table().select(COLUMNS).eq("stripe_session_id", p.sessionId).single();
      if (readError || !data) throw new Error(`polingual_gifts read failed: ${readError?.message ?? "no row"}`);
      return giftFromDb(data as DbGift);
    },
    setCodeHash: (id, codeHash) => patch(id, { code_hash: codeHash }, "undelivered"),
    markReceipt: (id, at) => patch(id, { receipt_sent_at: at }),
    markDelivered: (id, at) => patch(id, { delivered_at: at }),
    due: async (at, limit) => {
      const { data, error } = await table().select(COLUMNS).is("delivered_at", null).is("redeemed_at", null).is("voided_at", null).not("recipient_email", "is", null).lte("deliver_after", at).order("deliver_after").limit(limit);
      if (error) throw new Error(`polingual_gifts due read failed: ${error.message}`);
      return ((data ?? []) as DbGift[]).map(giftFromDb);
    },
    redeem: async (codeHash, userId, at) => {
      const { data, error } = await client().rpc("redeem_polingual_gift", { p_code_hash: codeHash, p_user_id: userId, p_now: at });
      if (error) throw new Error(`redeem_polingual_gift failed: ${error.message}`);
      const row = first<{ outcome?: string; access_until?: string | null }>(data);
      const outcome = OUTCOMES.find((o) => o === row?.outcome);
      if (!outcome) throw new Error("redeem_polingual_gift returned no outcome");
      return { outcome, until: row?.access_until ?? null };
    },
    voidByPayment: async (paymentIntent, reason, at) => {
      const { data, error } = await client().rpc("void_polingual_gift", { p_payment_intent: paymentIntent, p_reason: reason, p_now: at });
      if (error) throw new Error(`void_polingual_gift failed: ${error.message}`);
      const row = first<{ outcome?: string; revoked?: boolean }>(data);
      const outcome = VOID_OUTCOMES.find((o) => o === row?.outcome);
      if (!outcome) throw new Error("void_polingual_gift returned no outcome");
      return { outcome, revoked: row?.revoked === true };
    },
    purge: async (cutoff, at) => {
      const { data, error } = await client().rpc("purge_polingual_gift_pii", { p_cutoff: cutoff, p_now: at });
      if (error) throw new Error(`purge_polingual_gift_pii failed: ${error.message}`);
      return Number(data) || 0;
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

const STRIPE_API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

export function lineItemsFrom(body: unknown): LineItem[] | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return null;
  return data.map((d) => {
    const item = (d ?? {}) as { quantity?: unknown; price?: { id?: unknown; unit_amount?: unknown; currency?: unknown } | null };
    return {
      priceId: typeof item.price?.id === "string" ? item.price.id : null,
      quantity: typeof item.quantity === "number" ? item.quantity : null,
      unitAmount: typeof item.price?.unit_amount === "number" ? item.price.unit_amount : null,
      currency: typeof item.price?.currency === "string" ? item.price.currency : null,
    };
  });
}

export async function fetchLineItems(secretKey: string, sessionId: string, fetcher: typeof fetch = fetch): Promise<LineItem[] | null> {
  try {
    const res = await fetcher(`${STRIPE_API}/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=5`, { headers: { authorization: `Bearer ${secretKey}` } });
    if (!res.ok) return null;
    return lineItemsFrom(await res.json());
  } catch {
    return null;
  }
}

export function giftLimiter(name: string, max: number, windowMs: number): (keys: string[]) => Promise<boolean> {
  const local = rateLimiter(max, windowMs);
  let limited: ((key: string) => Promise<boolean>) | null = null;
  return async (keys) => {
    if (!limited) {
      const marks = getMarkStore();
      limited = layeredLimiter(local, marks ? sharedRateLimiter(marks, max, windowMs) : undefined);
    }
    for (const key of keys) if (await limited(`${name}:${key}`)) return true;
    return false;
  };
}

export function giftFulfilDeps(env: Record<string, string | undefined> = process.env) {
  const mail = giftMailConfig(env);
  const cfg = giftConfig(env);
  return {
    store: supabaseGiftStore,
    site: () => (env.POLINGUAL_SITE_URL ?? "https://www.polingual.com").replace(/\/$/, ""),
    postalAddress: () => mail?.postalAddress ?? null,
    price: () => cfg?.price ?? null,
    lineItems: async (sessionId: string) => (cfg ? fetchLineItems(cfg.secretKey, sessionId) : null),
    send: async (email: GiftEmail, key: string) => (mail ? sendGiftEmail(mail, email, key) : false),
    now: Date.now,
  };
}
