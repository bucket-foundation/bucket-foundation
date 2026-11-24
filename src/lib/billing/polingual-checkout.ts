import { createHmac, timingSafeEqual } from "node:crypto";

export type Plan = "monthly" | "yearly";
export type AffiliateNetwork = "rewardful" | "impact";

export interface CheckoutConfig {
  secretKey: string;
  prices: Record<Plan, string>;
  successUrl: string;
  cancelUrl: string;
  site: string;
}

export const TRIAL_DAYS = 7;
export const TRIAL_PLANS: readonly Plan[] = ["yearly"];

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
    site,
  };
}

export interface CheckoutRequest {
  plan: Plan;
  referral: string | null;
  network: AffiliateNetwork | null;
  email: string | null;
  returnTo?: "app";
  visitor?: string;
}

const REF_RE = /^[A-Za-z0-9_.-]{1,128}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VISITOR_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCheckoutRequest(body: unknown): { ok: true; req: CheckoutRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const plan = b.plan ?? "yearly";
  if (plan !== "monthly" && plan !== "yearly") return { ok: false, error: "bad_plan" };
  const rawRef = typeof b.referral === "string" ? b.referral.trim() : "";
  if (rawRef && !REF_RE.test(rawRef)) return { ok: false, error: "bad_referral" };
  const network = b.affiliate_network ?? (rawRef ? "rewardful" : null);
  if (network !== null && network !== "rewardful" && network !== "impact") return { ok: false, error: "bad_affiliate_network" };
  const email = typeof b.email === "string" && EMAIL_RE.test(b.email.trim()) ? b.email.trim().toLowerCase() : null;
  const req: CheckoutRequest = { plan, referral: rawRef || null, network: rawRef ? network : null, email };
  if (b.return_to === "app") req.returnTo = "app";
  if (typeof b.visitor === "string" && VISITOR_RE.test(b.visitor)) req.visitor = b.visitor.toLowerCase();
  return { ok: true, req };
}

export interface TrialHistory {
  used: boolean;
  customer: string | null;
}

export const FRESH: TrialHistory = { used: false, customer: null };

export function checkoutForm(cfg: CheckoutConfig, req: CheckoutRequest, userId: string, history: TrialHistory = FRESH): URLSearchParams {
  const f = new URLSearchParams();
  f.set("mode", "subscription");
  f.set("line_items[0][price]", cfg.prices[req.plan]);
  f.set("line_items[0][quantity]", "1");
  f.set("success_url", req.returnTo === "app" ? `${cfg.site}/app?checkout=done` : cfg.successUrl);
  f.set("cancel_url", req.returnTo === "app" ? `${cfg.site}/app` : cfg.cancelUrl);
  if (TRIAL_PLANS.includes(req.plan) && !history.used) f.set("subscription_data[trial_period_days]", String(TRIAL_DAYS));
  f.set("allow_promotion_codes", "true");
  f.set("metadata[product]", "polingual");
  f.set("metadata[plan]", req.plan);
  f.set("subscription_data[metadata][product]", "polingual");
  f.set("subscription_data[metadata][plan]", req.plan);
  if (history.customer) f.set("customer", history.customer);
  else if (req.email) f.set("customer_email", req.email);
  f.set("metadata[user_id]", userId);
  f.set("subscription_data[metadata][user_id]", userId);
  if (req.visitor) {
    f.set("metadata[visitor]", req.visitor);
    f.set("subscription_data[metadata][visitor]", req.visitor);
  }
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
  last_event_id: string | null;
  last_event_at: string | null;
}

export interface EntitlementState {
  user_id: string;
  status: string;
  stripe_subscription: string | null;
  last_event_id: string | null;
  last_event_at: string | null;
}

export interface EntitlementPatch {
  status: string;
  last_event_id: string | null;
  last_event_at: string | null;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
export const REVOKED_STATUSES = new Set(["canceled", "unpaid", "incomplete_expired", "refunded", "disputed"]);

export function subscriptionStatus(stripeStatus: unknown): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    case "canceled":
      return stripeStatus;
    default:
      return "unknown";
  }
}

function eventStamp(e: Obj): { last_event_id: string | null; last_event_at: string | null } {
  return { last_event_id: str(e.id), last_event_at: typeof e.created === "number" ? new Date(e.created * 1000).toISOString() : null };
}

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
    ...eventStamp(e),
  };
  if (e.type === "checkout.session.completed") {
    if (o.payment_status !== "paid" && o.payment_status !== "no_payment_required") return null;
    return { ...base, status: o.payment_status === "paid" ? "active" : "trialing", stripe_subscription: str(o.subscription), current_period_end: null };
  }
  if (e.type === "customer.subscription.updated" || e.type === "customer.subscription.created" || e.type === "customer.subscription.deleted") {
    const end = typeof o.current_period_end === "number" ? new Date(o.current_period_end * 1000).toISOString() : null;
    const status = e.type === "customer.subscription.deleted" ? "canceled" : subscriptionStatus(o.status);
    return { ...base, status, stripe_subscription: str(o.id), current_period_end: end };
  }
  return null;
}

export interface CustomerEvent {
  customer: string | null;
  charge: string | null;
  patch: EntitlementPatch;
}

export function customerEventFrom(event: unknown): CustomerEvent | null {
  const e = (event && typeof event === "object" ? event : {}) as Obj;
  const o = ((e.data as Obj | undefined)?.object ?? {}) as Obj;
  const stamp = eventStamp(e);
  if (e.type === "charge.refunded") return o.refunded === true ? { customer: str(o.customer), charge: null, patch: { status: "refunded", ...stamp } } : null;
  if (e.type === "charge.dispute.created") return { customer: null, charge: str(o.charge), patch: { status: "disputed", ...stamp } };
  if (e.type === "invoice.payment_failed") return { customer: str(o.customer), charge: null, patch: { status: "past_due", ...stamp } };
  return null;
}

export function isStale(current: EntitlementState | null, next: { status: string; stripe_subscription?: string | null; last_event_id: string | null; last_event_at: string | null }, fromCheckout = false): boolean {
  if (!current) return false;
  if (current.last_event_id && current.last_event_id === next.last_event_id) return true;
  if (current.last_event_at && next.last_event_at && Date.parse(next.last_event_at) < Date.parse(current.last_event_at)) return true;
  if (fromCheckout && REVOKED_STATUSES.has(current.status) && current.stripe_subscription !== null && current.stripe_subscription === next.stripe_subscription) return true;
  return false;
}

export interface CheckoutDeps {
  config: () => CheckoutConfig | null;
  userId: () => Promise<string | null>;
  currentStatus: (userId: string) => Promise<string | null>;
  trialHistory: (userId: string) => Promise<TrialHistory>;
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
  const current = await deps.currentStatus(uid);
  if (current && ACTIVE_STATUSES.has(current)) return { status: 409, body: { error: "already_subscribed", portal: true } };
  const s = await deps.createSession(cfg, checkoutForm(cfg, parsed.req, uid, await deps.trialHistory(uid)));
  if (!s.url) return { status: 502, body: { error: "checkout_failed" } };
  return { status: 200, body: { url: s.url, id: s.id } };
}

export interface TrialEnding {
  eventId: string;
  customer: string;
  trialEnd: number;
}

export function trialEndingFrom(event: unknown): TrialEnding | null {
  const e = (event && typeof event === "object" ? event : {}) as Obj;
  if (e.type !== "customer.subscription.trial_will_end") return null;
  const o = ((e.data as Obj | undefined)?.object ?? {}) as Obj;
  const meta = (o.metadata ?? {}) as Obj;
  const eventId = str(e.id);
  const customer = str(o.customer);
  if (!eventId || !customer || meta.product !== "polingual" || typeof o.trial_end !== "number" || o.cancel_at_period_end === true) return null;
  return { eventId, customer, trialEnd: o.trial_end };
}

export function trialEndingEmail(trialEnd: number, site: string): { subject: string; text: string } {
  const day = new Date(trialEnd * 1000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  return {
    subject: "Your Polingual trial ends in 3 days",
    text: `Your free trial ends on ${day}, when your yearly plan starts at $59.99. To cancel and pay nothing, open ${site}/app/account before then.`,
  };
}

export const DAY_S = 86_400;

export function dayZeroCancel(event: unknown): string | null {
  const e = (event && typeof event === "object" ? event : {}) as Obj;
  if (e.type !== "customer.subscription.updated") return null;
  const o = ((e.data as Obj | undefined)?.object ?? {}) as Obj;
  const meta = (o.metadata ?? {}) as Obj;
  const visitor = str(meta.visitor);
  const at = typeof o.canceled_at === "number" ? o.canceled_at : typeof e.created === "number" ? e.created : null;
  if (meta.product !== "polingual" || !visitor || !VISITOR_RE.test(visitor) || o.status !== "trialing" || o.cancel_at_period_end !== true) return null;
  if (typeof o.trial_start !== "number" || at === null || at - o.trial_start >= DAY_S) return null;
  return visitor.toLowerCase();
}

export interface WebhookDeps {
  secret: () => string | null;
  now: () => number;
  record: (e: Entitlement) => Promise<boolean>;
  current: (userId: string) => Promise<EntitlementState | null>;
  byCustomer: (customer: string) => Promise<EntitlementState | null>;
  chargeCustomer: (charge: string) => Promise<string | null>;
  patch: (userId: string, p: EntitlementPatch) => Promise<boolean>;
  gift?: (event: unknown) => Promise<HandlerResult | null>;
  trialEnding?: (t: TrialEnding) => Promise<boolean>;
  funnel?: (visitor: string, name: "trial_cancel_d0") => Promise<void>;
}

async function applyCustomerEvent(deps: WebhookDeps, ce: CustomerEvent): Promise<HandlerResult> {
  const customer = ce.customer ?? (ce.charge ? await deps.chargeCustomer(ce.charge) : null);
  const current = customer ? await deps.byCustomer(customer) : null;
  if (!current) return { status: 200, body: { received: true, ignored: true } };
  if (isStale(current, ce.patch)) return { status: 200, body: { received: true, stale: true } };
  if (ce.patch.status === "past_due" && !ACTIVE_STATUSES.has(current.status)) return { status: 200, body: { received: true, ignored: true } };
  if (!(await deps.patch(current.user_id, ce.patch))) return { status: 500, body: { error: "record_failed" } };
  return { status: 200, body: { received: true, status: ce.patch.status } };
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
  const ending = trialEndingFrom(event);
  if (ending) {
    if (deps.trialEnding && !(await deps.trialEnding(ending))) return { status: 500, body: { error: "reminder_failed" } };
    return { status: 200, body: { received: true, reminded: !!deps.trialEnding } };
  }
  const d0 = dayZeroCancel(event);
  if (d0 && deps.funnel) await deps.funnel(d0, "trial_cancel_d0").catch(() => undefined);
  const ce = customerEventFrom(event);
  const sub = ce ? await applyCustomerEvent(deps, ce) : null;
  if (sub && sub.status !== 200) return sub;
  const gift = await deps.gift?.(event);
  if (gift) return gift;
  if (sub) return sub;
  const ent = entitlementFromEvent(event);
  if (!ent) return { status: 200, body: { received: true, ignored: true } };
  const fromCheckout = (event as Obj).type === "checkout.session.completed";
  if (isStale(await deps.current(ent.user_id), ent, fromCheckout)) return { status: 200, body: { received: true, stale: true } };
  if (!(await deps.record(ent))) return { status: 500, body: { error: "record_failed" } };
  return { status: 200, body: { received: true, status: ent.status } };
}

export interface PortalDeps {
  secretKey: () => string | null;
  userId: () => Promise<string | null>;
  customer: (userId: string) => Promise<string | null>;
  createPortal: (secretKey: string, form: URLSearchParams) => Promise<string | null>;
  returnUrl: string;
}

export async function handlePortal(deps: PortalDeps): Promise<HandlerResult> {
  const key = deps.secretKey();
  if (!key) return { status: 503, body: { error: "portal_unavailable" } };
  const uid = await deps.userId();
  if (!uid) return { status: 401, body: { error: "unauthorized" } };
  const customer = await deps.customer(uid);
  if (!customer) return { status: 404, body: { error: "no_web_subscription" } };
  const f = new URLSearchParams();
  f.set("customer", customer);
  f.set("return_url", deps.returnUrl);
  const url = await deps.createPortal(key, f);
  if (!url) return { status: 502, body: { error: "portal_failed" } };
  return { status: 200, body: { url } };
}
