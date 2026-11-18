import type { Metadata } from "next";
import { SITE } from "./facts";
import { pageMeta } from "./meta";

export type GiftLang = "en" | "es";
export const GIFT_LANGS: readonly GiftLang[] = ["en", "es"];
export const NOTE_MAX = 300;
export const NAME_MAX = 80;

export function giftPath(lang: GiftLang, tail: "" | "/redeem" = ""): string {
  return `${lang === "es" ? "/es" : ""}/gift${tail}`;
}

const EN = {
  metaTitle: "Give a year of Polingual",
  description: "Buy one year of Polingual on the web as a gift. We email the code on the day you pick.",
  title: "Give a year of Polingual",
  lede: "One year of Polingual on the web at polingual.com. You pay once. We email a gift code to the person you choose on the day you pick.",
  price: (p: string) => `${p}, paid once.`,
  buyerEmail: "Your email",
  buyerHint: "Your receipt goes here.",
  recipientName: "Their name",
  recipientEmail: "Their email",
  note: "A short note",
  noteHint: `Optional, up to ${NOTE_MAX} characters.`,
  deliverOn: "Delivery date",
  deliverHint: "We send the gift email on this day, one hour or more after payment.",
  buy: "Buy the gift",
  sending: "Opening checkout",
  soon: "Gifts open soon",
  paid: "Thank you. Your receipt is in your inbox, and the gift email goes out on the day you picked.",
  terms: "The code works once and lasts a year from the delivery date. The year starts when it is redeemed at polingual.com. Refunds: support@polingual.com. A refund closes the code and ends the year it opened.",
  redeemMetaTitle: "Redeem a Polingual gift",
  redeemTitle: "Redeem your gift",
  redeemLede: "Sign in with your email, enter the code from your gift email, and your year of Polingual on the web starts today.",
  code: "Gift code",
  redeem: "Redeem",
  redeeming: "Redeeming",
  signIn: { label: "Polingual gift", title: "Sign in to redeem", intro: "Use the email you want the gift on. We send a one-time code." },
  done: (day: string) => `Your gift is active until ${day}.`,
  open: "Start learning",
  errors: {
    bad_buyer_email: "Enter your email like name@example.com.",
    bad_recipient_email: "Enter their email like name@example.com.",
    bad_recipient_name: `Enter their name, up to ${NAME_MAX} characters.`,
    bad_note: `Keep the note under ${NOTE_MAX} characters.`,
    bad_delivery_date: "Pick a delivery date from today to one year out.",
    gifts_unavailable: "Gifts open soon.",
    too_many_requests: "Too many tries. Wait an hour and try again.",
    bad_code: "Enter the 16 characters from your gift email.",
    invalid: "That code did not match. Check your gift email.",
    used: "That code was already redeemed on another account.",
    expired: "That code has expired. Write to support@polingual.com.",
    void: "That gift was refunded, so the code is closed. Write to support@polingual.com.",
    subscribed: "You already have a Polingual subscription. Keep the code for later or pass it to a friend.",
    unauthorized: "Sign in first, then redeem.",
    offline: "No connection. Check your network and try again.",
    fallback: "That did not go through. Try again in a minute.",
  },
};

const ES: typeof EN = {
  metaTitle: "Regala un año de Polingual",
  description: "Compra un año de Polingual en la web como regalo. Enviamos el código el día que elijas.",
  title: "Regala un año de Polingual",
  lede: "Un año de Polingual en la web, en polingual.com. Pagas una vez. Enviamos un código de regalo a quien elijas, el día que elijas.",
  price: (p: string) => `${p}, un solo pago.`,
  buyerEmail: "Tu correo",
  buyerHint: "Aquí llega tu recibo.",
  recipientName: "Su nombre",
  recipientEmail: "Su correo",
  note: "Una nota breve",
  noteHint: `Opcional, hasta ${NOTE_MAX} caracteres.`,
  deliverOn: "Fecha de entrega",
  deliverHint: "Enviamos el correo de regalo ese día, una hora o más después del pago.",
  buy: "Comprar el regalo",
  sending: "Abriendo el pago",
  soon: "Los regalos abren pronto",
  paid: "Gracias. Tu recibo está en tu correo y el regalo sale el día que elegiste.",
  terms: "El código sirve una vez y dura un año desde la fecha de entrega. El año empieza cuando se canjea en polingual.com. Reembolsos: support@polingual.com. Un reembolso cierra el código y termina el año que abrió.",
  redeemMetaTitle: "Canjea un regalo de Polingual",
  redeemTitle: "Canjea tu regalo",
  redeemLede: "Inicia sesión con tu correo, escribe el código de tu correo de regalo y tu año de Polingual en la web empieza hoy.",
  code: "Código de regalo",
  redeem: "Canjear",
  redeeming: "Canjeando",
  signIn: { label: "Regalo de Polingual", title: "Inicia sesión para canjear", intro: "Usa el correo donde quieres el regalo. Enviamos un código de un solo uso." },
  done: (day: string) => `Tu regalo está activo hasta el ${day}.`,
  open: "Empezar a aprender",
  errors: {
    bad_buyer_email: "Escribe tu correo, como nombre@ejemplo.com.",
    bad_recipient_email: "Escribe su correo, como nombre@ejemplo.com.",
    bad_recipient_name: `Escribe su nombre, hasta ${NAME_MAX} caracteres.`,
    bad_note: `La nota admite hasta ${NOTE_MAX} caracteres.`,
    bad_delivery_date: "Elige una fecha entre hoy y un año.",
    gifts_unavailable: "Los regalos abren pronto.",
    too_many_requests: "Demasiados intentos. Espera una hora y prueba otra vez.",
    bad_code: "Escribe los 16 caracteres de tu correo de regalo.",
    invalid: "Ese código no coincide. Revisa tu correo de regalo.",
    used: "Ese código ya se canjeó en otra cuenta.",
    expired: "Ese código venció. Escribe a support@polingual.com.",
    void: "Ese regalo se reembolsó y el código quedó cerrado. Escribe a support@polingual.com.",
    subscribed: "Ya tienes una suscripción de Polingual. Guarda el código o dáselo a un amigo.",
    unauthorized: "Inicia sesión y luego canjea.",
    offline: "Sin conexión. Revisa tu red y prueba otra vez.",
    fallback: "No se completó. Prueba otra vez en un minuto.",
  },
};

export type GiftCopy = typeof EN;

export function giftCopy(lang: GiftLang): GiftCopy {
  return lang === "es" ? ES : EN;
}

export function giftError(lang: GiftLang, code: string | undefined): string {
  const errors = giftCopy(lang).errors as Record<string, string>;
  return errors[code ?? ""] ?? errors.fallback;
}

export function giftMeta(lang: GiftLang, tail: "" | "/redeem"): Metadata {
  const c = giftCopy(lang);
  const title = tail ? c.redeemMetaTitle : c.metaTitle;
  return pageMeta({
    path: giftPath(lang, tail),
    title,
    documentTitle: `${title} | Polingual`,
    description: tail ? c.redeemLede : c.description,
    locale: lang === "es" ? "es_US" : "en_US",
    languages: { en: `${SITE}${giftPath("en", tail)}`, es: `${SITE}${giftPath("es", tail)}`, "x-default": `${SITE}${giftPath("en", tail)}` },
    noindex: tail === "/redeem",
  });
}

export interface GiftStatus {
  open: boolean;
  price: string | null;
}

export const GIFT_CLOSED: GiftStatus = { open: false, price: null };

export async function loadGiftStatus(f: typeof fetch = fetch): Promise<GiftStatus> {
  try {
    const r = await f("/api/academy/gift", { cache: "no-store" });
    const b = (await r.json().catch(() => null)) as { open?: unknown; price?: unknown } | null;
    if (!r.ok || b?.open !== true || typeof b.price !== "string" || !b.price) return GIFT_CLOSED;
    return { open: true, price: b.price };
  } catch {
    return GIFT_CLOSED;
  }
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function post(f: typeof fetch, url: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: Record<string, unknown> } | null> {
  try {
    const r = await f(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
    return { status: r.status, body: ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown> };
  } catch {
    return null;
  }
}

export async function startGiftCheckout(form: Record<string, unknown>, lang: GiftLang, f: typeof fetch = fetch): Promise<Result<string>> {
  const r = await post(f, "/api/academy/gift/checkout", { ...form, locale: lang });
  if (!r) return { ok: false, error: giftError(lang, "offline") };
  if (r.status !== 200 || typeof r.body.url !== "string") return { ok: false, error: giftError(lang, typeof r.body.error === "string" ? r.body.error : undefined) };
  return { ok: true, value: r.body.url };
}

export async function redeemGift(code: string, token: string | null, lang: GiftLang, f: typeof fetch = fetch): Promise<Result<string | null>> {
  if (!token) return { ok: false, error: giftError(lang, "unauthorized") };
  const r = await post(f, "/api/academy/gift/redeem", { code }, { Authorization: `Bearer ${token}` });
  if (!r) return { ok: false, error: giftError(lang, "offline") };
  const outcome = typeof r.body.outcome === "string" ? r.body.outcome : typeof r.body.error === "string" ? r.body.error : undefined;
  if (r.status !== 200) return { ok: false, error: giftError(lang, outcome) };
  return { ok: true, value: typeof r.body.until === "string" ? r.body.until : null };
}

export function giftDay(iso: string | null, lang: GiftLang): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  return new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}
