import { createHmac, timingSafeEqual } from "node:crypto";

export type Plan = "monthly" | "yearly";
export type AffiliateNetwork = "rewardful" | "impact";

export interface CheckoutConfig {
  secretKey: string;
  prices: Record<Plan, string>;
  successUrl: string;
  cancelUrl: string;
}

type Env = Record<string, string | undefined>;

export function checkoutConfig(env: Env): CheckoutConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY ?? "";
  const monthly = env.STRIPE_PRICE_POLINGUAL_MONTHLY ?? "";
  const yearly = env.STRIPE_PRICE_POLINGUAL_YEARLY ?? "";
  if (!secretKey || !monthly || !yearly) return null;
  const site = (env.POLINGUAL_SITE_URL ?? "https://polingual.com").replace(/\/$/, "");
  return {
    secretKey,
    prices: { monthly, yearly },
    successUrl: `${site}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${site}/pricing`,
  };
}

export interface CheckoutRequest {
  plan: Plan;
  referral: string | null;
  network: AffiliateNetwork | null;
  email: string | null;
}

const REF_RE = /^[A-Za-z0-9_.-]{1,128}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCheckoutRequest(body: unknown): { ok: true; req: CheckoutRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const plan = b.plan ?? "yearly";
  if (plan !== "monthly" && plan !== "yearly") return { ok: false, error: "bad_plan" };
  const rawRef = typeof b.referral === "string" ? b.referral.trim() : "";
  if (rawRef && !REF_RE.test(rawRef)) return { ok: false, error: "bad_referral" };
  const network = b.affiliate_network ?? (rawRef ? "rewardful" : null);
  if (network !== null && network !== "rewardful" && network !== "impact") return { ok: false, error: "bad_affiliate_network" };
  const email = typeof b.email === "string" && EMAIL_RE.test(b.email.trim()) ? b.email.trim().toLowerCase() : null;
  return { ok: true, req: { plan, referral: rawRef || null, network: rawRef ? network : null, email } };
}

export function checkoutForm(cfg: CheckoutConfig, req: CheckoutRequest, userId: string): URLSearchParams {
  const f = new URLSearchParams();
  f.set("mode", "subscription");
  f.set("line_items[0][price]", cfg.prices[req.plan]);
  f.set("line_items[0][quantity]", "1");
  f.set("success_url", cfg.successUrl);
  f.set("cancel_url", cfg.cancelUrl);
  f.set("allow_promotion_codes", "true");
  f.set("metadata[product]", "polingual");
  f.set("metadata[plan]", req.plan);
  f.set("subscription_data[metadata][product]", "polingual");
  f.set("subscription_data[metadata][plan]", req.plan);
  if (req.email) f.set("customer_email", req.email);
  f.set("metadata[user_id]", userId);
  f.set("subscription_data[metadata][user_id]", userId);
  if (req.referral && req.network) {
    if (req.network === "rewardful") f.set("client_reference_id", req.referral);
    f.set("metadata[referral]", req.referral);
    f.set("metadata[affiliate_network]", req.network);
    f.set("subscription_data[metadata][referral]", req.referral);
    f.set("subscription_data[metadata][affiliate_network]", req.network);
  }
  return f;
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSeconds: number, toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  let t = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") t = v ?? "";
    else if (k === "v1" && v) sigs.push(v);
  }
  const ts = Number(t);
  if (!t || !Number.isFinite(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds || sigs.length === 0) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return sigs.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export interface Entitlement {
  user_id: string;
  product: "polingual";
  status: string;
  plan: string | null;
  stripe_customer: string | null;
  stripe_subscription: string | null;
  referral: string | null;
  affiliate_network: string | null;
  current_period_end: string | null;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export function entitlementFromEvent(event: unknown): Entitlement | null {
  const e = (event && typeof event === "object" ? event : {}) as Obj;
  const o = ((e.data as Obj | undefined)?.object ?? {}) as Obj;
  const meta = (o.metadata && typeof o.metadata === "object" ? o.metadata : {}) as Obj;
  const userId = str(meta.user_id);
  if (!userId || meta.product !== "polingual") return null;
  const base = {
    user_id: userId,
    product: "polingual" as const,
    plan: str(meta.plan),
    stripe_customer: str(o.customer),
    referral: str(meta.referral),
    affiliate_network: str(meta.affiliate_network),
  };
  if (e.type === "checkout.session.completed") {
    if (o.payment_status !== "paid" && o.payment_status !== "no_payment_required") return null;
    return { ...base, status: "active", stripe_subscription: str(o.subscription), current_period_end: null };
  }
  if (e.type === "customer.subscription.updated" || e.type === "customer.subscription.created" || e.type === "customer.subscription.deleted") {
    const end = typeof o.current_period_end === "number" ? new Date(o.current_period_end * 1000).toISOString() : null;
    const status = e.type === "customer.subscription.deleted" ? "canceled" : (str(o.status) ?? "unknown");
    return { ...base, status, stripe_subscription: str(o.id), current_period_end: end };
  }
  return null;
}

export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export interface CheckoutDeps {
  config: () => CheckoutConfig | null;
  userId: () => Promise<string | null>;
  createSession: (cfg: CheckoutConfig, form: URLSearchParams) => Promise<{ url: string | null; id: string | null }>;
}

export type HandlerResult = { status: number; body: Record<string, unknown> };

export async function handleCheckout(deps: CheckoutDeps, body: unknown): Promise<HandlerResult> {
  const cfg = deps.config();
  if (!cfg) return { status: 503, body: { error: "checkout_unavailable" } };
  const parsed = parseCheckoutRequest(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const uid = await deps.userId();
  if (!uid) return { status: 401, body: { error: "unauthorized" } };
  const s = await deps.createSession(cfg, checkoutForm(cfg, parsed.req, uid));
  if (!s.url) return { status: 502, body: { error: "checkout_failed" } };
  return { status: 200, body: { url: s.url, id: s.id } };
}

export interface WebhookDeps {
  secret: () => string | null;
  now: () => number;
  record: (e: Entitlement) => Promise<boolean>;
}

export async function handleWebhook(deps: WebhookDeps, payload: string, signature: string | null): Promise<HandlerResult> {
  const secret = deps.secret();
  if (!secret) return { status: 503, body: { error: "webhook_unavailable" } };
  if (!verifyStripeSignature(payload, signature, secret, Math.floor(deps.now() / 1000))) return { status: 400, body: { error: "bad_signature" } };
  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return { status: 400, body: { error: "bad_payload" } };
  }
  const ent = entitlementFromEvent(event);
  if (!ent) return { status: 200, body: { received: true, ignored: true } };
  if (!(await deps.record(ent))) return { status: 500, body: { error: "record_failed" } };
  return { status: 200, body: { received: true, status: ent.status } };
}
