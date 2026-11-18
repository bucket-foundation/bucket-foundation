import { createHash, randomBytes } from "node:crypto";
import type { HandlerResult } from "./polingual-checkout";

export type GiftLocale = "en" | "es";
export const GIFT_LOCALES: readonly GiftLocale[] = ["en", "es"];
export const GIFT_PRODUCT = "polingual_gift";
export const GIFT_PLAN = "gift_yearly";
export const GIFT_LIMITS = { name: 80, note: 300, maxDaysAhead: 365, codeValidDays: 365, deliverBatch: 50 } as const;
export const GIFT_ENV = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_POLINGUAL_GIFT_YEARLY", "STRIPE_WEBHOOK_SECRET", "POLINGUAL_GIFT_PRICE_DISPLAY", "RESEND_API_KEY", "INVITE_POSTAL_ADDRESS"] as const;

const DAY_MS = 86_400_000;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJKMNP-Z2-9]{16}$/;

type Env = Record<string, string | undefined>;

export interface GiftConfig {
  secretKey: string;
  price: string;
  displayPrice: string;
  site: string;
}

export interface GiftMailConfig {
  apiKey: string;
  from: string;
  postalAddress: string;
}

export function giftConfig(env: Env): GiftConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const price = env.STRIPE_PRICE_POLINGUAL_GIFT_YEARLY?.trim() ?? "";
  const displayPrice = env.POLINGUAL_GIFT_PRICE_DISPLAY?.trim() ?? "";
  if (!secretKey || !price || !displayPrice || !env.STRIPE_WEBHOOK_SECRET?.trim()) return null;
  return { secretKey, price, displayPrice, site: (env.POLINGUAL_SITE_URL ?? "https://www.polingual.com").replace(/\/$/, "") };
}

export function giftMailConfig(env: Env): GiftMailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const postalAddress = env.INVITE_POSTAL_ADDRESS?.trim() ?? "";
  if (!apiKey || !postalAddress) return null;
  return { apiKey, postalAddress, from: env.POLINGUAL_GIFT_FROM?.trim() || env.BETA_FROM?.trim() || "Polingual <hello@bucket.foundation>" };
}

export function giftStatus(env: Env, storeReady: boolean): { open: boolean; price: string | null } {
  const cfg = giftConfig(env);
  const open = Boolean(cfg && giftMailConfig(env) && storeReady);
  return { open, price: open && cfg ? cfg.displayPrice : null };
}

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export interface GiftRequest {
  buyerEmail: string;
  recipientEmail: string;
  recipientName: string;
  note: string | null;
  deliverOn: string;
  locale: GiftLocale;
}

function email(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s.length <= 254 && EMAIL_RE.test(s) ? s : null;
}

function line(v: unknown): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim() : "";
}

function validDay(v: string): boolean {
  return DAY_RE.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && utcDay(Date.parse(`${v}T00:00:00Z`)) === v;
}

export function parseGiftRequest(body: unknown, now: number): { ok: true; req: GiftRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const buyerEmail = email(b.buyerEmail);
  if (!buyerEmail) return { ok: false, error: "bad_buyer_email" };
  const recipientEmail = email(b.recipientEmail);
  if (!recipientEmail) return { ok: false, error: "bad_recipient_email" };
  const recipientName = line(b.recipientName);
  if (!recipientName || recipientName.length > GIFT_LIMITS.name) return { ok: false, error: "bad_recipient_name" };
  const note = line(b.note);
  if (note.length > GIFT_LIMITS.note) return { ok: false, error: "bad_note" };
  const today = utcDay(now);
  const deliverOn = b.deliverOn === undefined || b.deliverOn === null || b.deliverOn === "" ? today : b.deliverOn;
  if (typeof deliverOn !== "string" || !validDay(deliverOn)) return { ok: false, error: "bad_delivery_date" };
  if (deliverOn < utcDay(now - DAY_MS) || deliverOn > utcDay(now + GIFT_LIMITS.maxDaysAhead * DAY_MS)) return { ok: false, error: "bad_delivery_date" };
  const locale = b.locale ?? "en";
  if (locale !== "en" && locale !== "es") return { ok: false, error: "bad_locale" };
  return { ok: true, req: { buyerEmail, recipientEmail, recipientName, note: note || null, deliverOn: deliverOn < today ? today : deliverOn, locale } };
}

export function giftPath(locale: GiftLocale, tail = ""): string {
  return `${locale === "es" ? "/es" : ""}/gift${tail}`;
}

export function giftForm(cfg: GiftConfig, req: GiftRequest): URLSearchParams {
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("line_items[0][price]", cfg.price);
  f.set("line_items[0][quantity]", "1");
  f.set("success_url", `${cfg.site}${giftPath(req.locale)}?paid=1`);
  f.set("cancel_url", `${cfg.site}${giftPath(req.locale)}`);
  f.set("customer_email", req.buyerEmail);
  f.set("locale", req.locale);
  f.set("metadata[product]", GIFT_PRODUCT);
  f.set("metadata[recipient_email]", req.recipientEmail);
  f.set("metadata[recipient_name]", req.recipientName);
  f.set("metadata[deliver_on]", req.deliverOn);
  f.set("metadata[locale]", req.locale);
  if (req.note) f.set("metadata[note]", req.note);
  return f;
}

export interface GiftPurchase extends GiftRequest {
  eventId: string;
  sessionId: string;
  amountTotal: number | null;
  currency: string | null;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export function isGiftEvent(event: unknown): boolean {
  const e = (event && typeof event === "object" ? event : {}) as Obj;
  const o = ((e.data as Obj | undefined)?.object ?? {}) as Obj;
  return e.type === "checkout.session.completed" && ((o.metadata ?? {}) as Obj).product === GIFT_PRODUCT;
}

export function giftFromEvent(event: unknown, now: number): GiftPurchase | null {
  if (!isGiftEvent(event)) return null;
  const e = event as Obj;
  const o = (e.data as Obj).object as Obj;
  const meta = o.metadata as Obj;
  const eventId = str(e.id);
  const sessionId = str(o.id);
  if (!eventId || !sessionId || o.mode !== "payment" || o.payment_status !== "paid") return null;
  const details = (o.customer_details ?? {}) as Obj;
  const buyerEmail = email(o.customer_email) ?? email(details.email);
  const recipientEmail = email(meta.recipient_email);
  const recipientName = line(meta.recipient_name).slice(0, GIFT_LIMITS.name);
  const deliverOn = typeof meta.deliver_on === "string" && validDay(meta.deliver_on) ? meta.deliver_on : utcDay(now);
  if (!buyerEmail || !recipientEmail || !recipientName) return null;
  return {
    eventId,
    sessionId,
    buyerEmail,
    recipientEmail,
    recipientName,
    note: line(meta.note).slice(0, GIFT_LIMITS.note) || null,
    deliverOn,
    locale: meta.locale === "es" ? "es" : "en",
    amountTotal: typeof o.amount_total === "number" && Number.isInteger(o.amount_total) ? o.amount_total : null,
    currency: str(o.currency)?.toLowerCase() ?? null,
  };
}

export function newGiftCode(random: (n: number) => Uint8Array = randomBytes): string {
  let out = "";
  while (out.length < 16) {
    for (const b of Array.from(random(32))) {
      if (b < 248 && out.length < 16) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return out;
}

export function formatGiftCode(code: string): string {
  return code.match(/.{4}/g)?.join("-") ?? code;
}

export function normalizeGiftCode(v: unknown): string | null {
  const s = typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  return CODE_RE.test(s) ? s : null;
}

export function giftCodeHash(code: string): string {
  return createHash("sha256").update(`polingual-gift:v1:${code}`).digest("hex");
}

export interface GiftRow extends GiftPurchase {
  id: string;
  code: string | null;
  expiresAt: string;
  receiptSentAt: string | null;
  deliveredAt: string | null;
  redeemedAt: string | null;
}

export type RedeemOutcome = "redeemed" | "already" | "used" | "expired" | "invalid" | "subscribed";

export interface GiftStore {
  record(purchase: GiftPurchase, code: string, expiresAt: string): Promise<GiftRow>;
  markReceipt(id: string, at: string): Promise<void>;
  markDelivered(id: string, at: string): Promise<void>;
  due(day: string, limit: number): Promise<GiftRow[]>;
  redeem(codeHash: string, userId: string, at: string): Promise<{ outcome: RedeemOutcome; until: string | null }>;
}

export interface GiftEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const BOX = "font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#231F20";
const CTA = "display:inline-block;background:#D9381E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700";
const SMALL = "font-size:13px;color:#5d5650";
const CODE_STYLE = "font-family:ui-monospace,monospace;font-size:20px;letter-spacing:1px;font-weight:700";

export function giftAmount(amountTotal: number | null, currency: string | null, locale: GiftLocale): string | null {
  if (amountTotal === null || !currency || !/^[a-z]{3}$/.test(currency)) return null;
  const zero = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(zero.has(currency) ? amountTotal : amountTotal / 100);
}

function longDay(day: string, locale: GiftLocale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

const COPY = {
  en: {
    receiptSubject: (name: string) => `Your Polingual gift for ${name}`,
    receiptLead: (name: string) => `Thank you. You bought ${name} one year of Polingual.`,
    paid: (amount: string) => `You paid ${amount}. Stripe sends its own payment receipt.`,
    arrives: (to: string, day: string) => `We email the gift code to ${to} on ${day}.`,
    receiptWhy: "You get this email because you bought a Polingual gift with this address.",
    help: "Questions or a refund: reply to this email or write to support@polingual.com.",
    giftSubject: (name: string) => `${name}, a year of Polingual is yours`,
    giftLead: (name: string, from: string) => `${name}, ${from} bought you one year of Polingual, the app for learning several languages side by side.`,
    noteLabel: "Their note:",
    codeLabel: "Your gift code:",
    redeem: "Redeem your gift",
    how: "Open the link, sign in with your email and enter the code. Your year starts the day you redeem.",
    expires: (day: string) => `Redeem by ${day}.`,
    giftWhy: (from: string) => `You get this one email because ${from} bought you a gift and gave us your address. We send no marketing to it. To have it removed, write to privacy@polingual.com.`,
  },
  es: {
    receiptSubject: (name: string) => `Tu regalo de Polingual para ${name}`,
    receiptLead: (name: string) => `Gracias. Le compraste a ${name} un año de Polingual.`,
    paid: (amount: string) => `Pagaste ${amount}. Stripe envía su propio recibo de pago.`,
    arrives: (to: string, day: string) => `Enviamos el código de regalo a ${to} el ${day}.`,
    receiptWhy: "Recibes este correo porque compraste un regalo de Polingual con esta dirección.",
    help: "Preguntas o reembolso: responde a este correo o escribe a support@polingual.com.",
    giftSubject: (name: string) => `${name}, un año de Polingual es tuyo`,
    giftLead: (name: string, from: string) => `${name}, ${from} te regaló un año de Polingual, la app para aprender varios idiomas a la vez.`,
    noteLabel: "Su nota:",
    codeLabel: "Tu código de regalo:",
    redeem: "Canjear tu regalo",
    how: "Abre el enlace, inicia sesión con tu correo y escribe el código. Tu año empieza el día que lo canjeas.",
    expires: (day: string) => `Canjéalo antes del ${day}.`,
    giftWhy: (from: string) => `Recibes este único correo porque ${from} te compró un regalo y nos dio tu dirección. No le enviamos publicidad. Para eliminarla, escribe a privacy@polingual.com.`,
  },
} as const;

function footer(why: string, postalAddress: string): { text: string; html: string } {
  return { text: `${why}\n\nPolingual, AGFarms LLC\n${postalAddress}`, html: `<p style="${SMALL}">${escapeHtml(why)}<br>Polingual, AGFarms LLC<br>${escapeHtml(postalAddress)}</p>` };
}

export function renderReceipt(gift: GiftRow, postalAddress: string): GiftEmail {
  const c = COPY[gift.locale];
  const amount = giftAmount(gift.amountTotal, gift.currency, gift.locale);
  const lines = [c.receiptLead(gift.recipientName), ...(amount ? [c.paid(amount)] : []), c.arrives(gift.recipientEmail, longDay(gift.deliverOn, gift.locale)), c.help];
  const foot = footer(c.receiptWhy, postalAddress);
  return {
    to: gift.buyerEmail,
    subject: c.receiptSubject(gift.recipientName),
    text: `${lines.join("\n\n")}\n\n${foot.text}\n`,
    html: `<div style="${BOX}">${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}${foot.html}</div>`,
  };
}

export function redeemUrl(site: string, locale: GiftLocale, code: string): string {
  return `${site}${giftPath(locale, "/redeem")}?code=${formatGiftCode(code)}`;
}

export function renderGiftEmail(gift: GiftRow, site: string, postalAddress: string): GiftEmail {
  if (!gift.code) throw new Error("gift has no code to send");
  const c = COPY[gift.locale];
  const code = formatGiftCode(gift.code);
  const link = redeemUrl(site, gift.locale, gift.code);
  const expires = c.expires(longDay(gift.expiresAt.slice(0, 10), gift.locale));
  const lead = c.giftLead(gift.recipientName, gift.buyerEmail);
  const foot = footer(c.giftWhy(gift.buyerEmail), postalAddress);
  const note = gift.note ? `${c.noteLabel} ${gift.note}` : null;
  return {
    to: gift.recipientEmail,
    subject: c.giftSubject(gift.recipientName),
    text: [lead, ...(note ? [note] : []), `${c.codeLabel} ${code}`, `${c.redeem}: ${link}`, `${c.how} ${expires}`, foot.text, ""].join("\n\n"),
    html: `<div style="${BOX}"><p>${escapeHtml(lead)}</p>${note ? `<p>${escapeHtml(note)}</p>` : ""}<p>${escapeHtml(c.codeLabel)}<br><span style="${CODE_STYLE}">${code}</span></p><p><a href="${escapeHtml(link)}" style="${CTA}">${escapeHtml(c.redeem)}</a></p><p>${escapeHtml(c.how)} ${escapeHtml(expires)}</p>${foot.html}</div>`,
  };
}

export interface GiftCheckoutDeps {
  config: () => GiftConfig | null;
  ready: () => boolean;
  now: () => number;
  allow: () => boolean;
  createSession: (cfg: GiftConfig, form: URLSearchParams) => Promise<{ url: string | null; id: string | null }>;
}

export async function handleGiftCheckout(deps: GiftCheckoutDeps, body: unknown): Promise<HandlerResult> {
  const cfg = deps.config();
  if (!cfg || !deps.ready()) return { status: 503, body: { error: "gifts_unavailable" } };
  if (!deps.allow()) return { status: 429, body: { error: "too_many_requests" } };
  const parsed = parseGiftRequest(body, deps.now());
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const s = await deps.createSession(cfg, giftForm(cfg, parsed.req));
  if (!s.url) return { status: 502, body: { error: "checkout_failed" } };
  return { status: 200, body: { url: s.url, id: s.id } };
}

export interface GiftFulfilDeps {
  store: () => GiftStore | null;
  site: () => string;
  postalAddress: () => string | null;
  send: (email: GiftEmail, idempotencyKey: string) => Promise<boolean>;
  now: () => number;
  code?: () => string;
}

async function sendReceipt(deps: GiftFulfilDeps, store: GiftStore, gift: GiftRow, postal: string): Promise<boolean> {
  if (gift.receiptSentAt) return true;
  if (!(await deps.send(renderReceipt(gift, postal), `polingual-gift/receipt/${gift.id}`))) return false;
  await store.markReceipt(gift.id, new Date(deps.now()).toISOString());
  return true;
}

async function deliver(deps: GiftFulfilDeps, store: GiftStore, gift: GiftRow, postal: string): Promise<boolean> {
  if (gift.deliveredAt || gift.redeemedAt) return true;
  if (!(await deps.send(renderGiftEmail(gift, deps.site(), postal), `polingual-gift/deliver/${gift.id}`))) return false;
  await store.markDelivered(gift.id, new Date(deps.now()).toISOString());
  return true;
}

export async function handleGiftEvent(deps: GiftFulfilDeps, event: unknown): Promise<HandlerResult | null> {
  if (!isGiftEvent(event)) return null;
  const now = deps.now();
  const purchase = giftFromEvent(event, now);
  if (!purchase) return { status: 200, body: { received: true, ignored: true } };
  const store = deps.store();
  const postal = deps.postalAddress();
  if (!store || !postal) return { status: 503, body: { error: "gifts_unavailable" } };
  const expiresAt = new Date(Date.parse(`${purchase.deliverOn}T00:00:00Z`) + GIFT_LIMITS.codeValidDays * DAY_MS).toISOString();
  const gift = await store.record(purchase, (deps.code ?? newGiftCode)(), expiresAt);
  if (!(await sendReceipt(deps, store, gift, postal))) return { status: 500, body: { error: "receipt_failed" } };
  if (gift.deliverOn <= utcDay(now) && !(await deliver(deps, store, gift, postal))) return { status: 500, body: { error: "delivery_failed" } };
  return { status: 200, body: { received: true, gift: gift.id } };
}

export interface DeliveryReport {
  due: number;
  sent: number;
  failed: number;
}

export async function deliverDueGifts(deps: GiftFulfilDeps): Promise<DeliveryReport | null> {
  const store = deps.store();
  const postal = deps.postalAddress();
  if (!store || !postal) return null;
  const due = await store.due(utcDay(deps.now()), GIFT_LIMITS.deliverBatch);
  const report: DeliveryReport = { due: due.length, sent: 0, failed: 0 };
  for (const gift of due) {
    try {
      if (await deliver(deps, store, gift, postal)) report.sent++;
      else report.failed++;
    } catch (err) {
      report.failed++;
      console.error("[polingual-gift] delivery failed:", gift.id, err instanceof Error ? err.message : "unknown");
    }
  }
  return report;
}

export interface RedeemDeps {
  store: () => GiftStore | null;
  userId: () => Promise<string | null>;
  now: () => number;
}

const REDEEM_STATUS: Record<RedeemOutcome, number> = { redeemed: 200, already: 200, used: 409, expired: 410, invalid: 404, subscribed: 409 };

export async function handleRedeem(deps: RedeemDeps, body: unknown): Promise<HandlerResult> {
  const store = deps.store();
  if (!store) return { status: 503, body: { error: "gifts_unavailable" } };
  const uid = await deps.userId();
  if (!uid) return { status: 401, body: { error: "unauthorized" } };
  const code = normalizeGiftCode((body as { code?: unknown } | null)?.code);
  if (!code) return { status: 400, body: { error: "bad_code" } };
  const r = await store.redeem(giftCodeHash(code), uid, new Date(deps.now()).toISOString());
  return { status: REDEEM_STATUS[r.outcome], body: { outcome: r.outcome, until: r.until } };
}

export class WindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}
  take(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }
}
