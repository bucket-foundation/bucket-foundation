import { createHash } from "node:crypto";
import { ACTIVE_STATUSES, type EntitlementState } from "./polingual-checkout";

export const PLAY_PACKAGE = "com.polingual.app";
export const PLAY_PLANS: Record<string, string> = {
  "com.polingual.monthly": "monthly",
  "com.polingual.yearly": "yearly",
  "com.polingual.family.yearly": "family",
  "com.polingual.lifetime": "lifetime",
};
export const PLAY_LIFETIME = "com.polingual.lifetime";
const DAY_MS = 24 * 3600 * 1000;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export type PlayKind = "subs" | "inapp";

export interface PlayRow {
  purchase_token: string;
  user_id: string | null;
  package_name: string;
  product_id: string;
  kind: PlayKind;
  state: string;
  trial: boolean;
  expiry: string | null;
  started_at: string | null;
  linked_purchase_token: string | null;
  account_hash: string | null;
  canceled_at: string | null;
}

export interface PlayRecord {
  row: Omit<PlayRow, "user_id">;
  acknowledged: boolean;
  cancelMs: number | null;
}

export interface PlayGoogle {
  subscription: (pkg: string, token: string) => Promise<Obj | null>;
  product: (pkg: string, productId: string, token: string) => Promise<Obj | null>;
  acknowledge: (pkg: string, kind: PlayKind, productId: string, token: string) => Promise<boolean>;
}

export interface PlayStore {
  row: (token: string) => Promise<PlayRow | null>;
  save: (row: PlayRow) => Promise<boolean>;
  replace: (token: string) => Promise<void>;
}

export interface PlayEntitlement {
  user_id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
  last_event_id: string;
  last_event_at: string;
}

export type PlayFunnelStep = "trial_start" | "paid" | "trial_cancel_d0";

export interface PlayDeps {
  google: () => PlayGoogle | null;
  store: PlayStore;
  current: (userId: string) => Promise<EntitlementState | null>;
  record: (e: PlayEntitlement) => Promise<boolean>;
  markTrial: (userId: string) => Promise<void>;
  funnel?: (visitor: string, name: PlayFunnelStep) => Promise<void>;
  now: () => number;
}

export interface Result {
  status: number;
  body: Obj;
}

export const accountHash = (userId: string) => createHash("sha256").update(userId).digest("hex");

const SUB_STATES: Record<string, string> = {
  SUBSCRIPTION_STATE_PENDING: "incomplete",
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: "past_due",
  SUBSCRIPTION_STATE_ON_HOLD: "unpaid",
  SUBSCRIPTION_STATE_PAUSED: "paused",
  SUBSCRIPTION_STATE_EXPIRED: "canceled",
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: "incomplete_expired",
};

export function fromSubscription(pkg: string, token: string, productHint: string | null, g: Obj): PlayRecord | null {
  const items = Array.isArray(g.lineItems) ? g.lineItems.map(obj) : [];
  const item = items.find((i) => str(i.productId) && PLAY_PLANS[str(i.productId) as string]) ?? items[0];
  const productId = str(item?.productId) ?? productHint;
  if (!productId) return null;
  const trial = items.some((i) => Object.keys(obj(obj(i.offerPhase).freeTrial)).length > 0 || "freeTrial" in obj(i.offerPhase));
  const state = str(g.subscriptionState) ?? "";
  const live = state === "SUBSCRIPTION_STATE_ACTIVE" || state === "SUBSCRIPTION_STATE_CANCELED";
  const expiries = items.map((i) => Date.parse(str(i.expiryTime) ?? "")).filter((n) => Number.isFinite(n));
  const cancel = Date.parse(str(obj(obj(g.canceledStateContext).userInitiatedCancellation).cancelTime) ?? "");
  return {
    row: {
      purchase_token: token,
      package_name: pkg,
      product_id: productId,
      kind: "subs",
      state: live ? (trial ? "trialing" : "active") : (SUB_STATES[state] ?? "incomplete"),
      trial,
      expiry: expiries.length ? new Date(Math.max(...expiries)).toISOString() : null,
      started_at: str(g.startTime),
      linked_purchase_token: str(g.linkedPurchaseToken),
      account_hash: str(obj(g.externalAccountIdentifiers).obfuscatedExternalAccountId),
      canceled_at: Number.isFinite(cancel) ? new Date(cancel).toISOString() : null,
    },
    acknowledged: g.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    cancelMs: Number.isFinite(cancel) ? cancel : null,
  };
}

export function fromProduct(pkg: string, token: string, productId: string, g: Obj): PlayRecord {
  const state = g.purchaseState === 0 ? "active" : g.purchaseState === 1 ? "canceled" : "incomplete";
  const ms = Number(g.purchaseTimeMillis);
  return {
    row: {
      purchase_token: token,
      package_name: pkg,
      product_id: productId,
      kind: "inapp",
      state,
      trial: false,
      expiry: null,
      started_at: Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null,
      linked_purchase_token: null,
      account_hash: str(g.obfuscatedExternalAccountId),
      canceled_at: null,
    },
    acknowledged: g.acknowledgementState === 1,
    cancelMs: null,
  };
}

async function fetchRecord(google: PlayGoogle, pkg: string, kind: PlayKind, productId: string | null, token: string): Promise<PlayRecord | null> {
  if (kind === "inapp") {
    if (!productId) return null;
    const g = await google.product(pkg, productId, token);
    return g ? fromProduct(pkg, token, productId, g) : null;
  }
  const g = await google.subscription(pkg, token);
  return g ? fromSubscription(pkg, token, productId, g) : null;
}

export function funnelStep(prev: EntitlementState | null, status: string): "trial_start" | "paid" | null {
  if (status === "trialing") return prev ? null : "trial_start";
  if (status === "active") return prev?.status === "active" ? null : "paid";
  return null;
}

export function dayZeroCancel(rec: PlayRecord, before: PlayRow | null): boolean {
  if (!rec.row.trial || rec.cancelMs === null || !rec.row.started_at) return false;
  if (before?.canceled_at) return false;
  const start = Date.parse(rec.row.started_at);
  return Number.isFinite(start) && rec.cancelMs - start >= 0 && rec.cancelMs - start < DAY_MS;
}

function entitled(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

function stripeHolds(current: EntitlementState | null): boolean {
  return Boolean(current?.stripe_subscription) && entitled(current?.status ?? "");
}

async function applyEntitlement(deps: PlayDeps, userId: string, rec: PlayRecord, eventId: string, d0: boolean): Promise<boolean> {
  const prev = await deps.current(userId);
  const status = rec.row.state;
  const funnel = (name: PlayFunnelStep) => (deps.funnel ? deps.funnel(userId.toLowerCase(), name).catch(() => undefined) : Promise.resolve());
  if (d0) await funnel("trial_cancel_d0");
  if (stripeHolds(prev)) return true;
  const fromPlay = prev?.last_event_id?.startsWith("play:") ?? false;
  if (prev && !fromPlay && entitled(prev.status) && !entitled(status)) return true;
  const ok = await deps.record({
    user_id: userId,
    status,
    plan: PLAY_PLANS[rec.row.product_id] ?? rec.row.product_id,
    current_period_end: rec.row.expiry,
    last_event_id: eventId,
    last_event_at: new Date(deps.now()).toISOString(),
  });
  if (!ok) return false;
  if (rec.row.trial) await deps.markTrial(userId).catch(() => undefined);
  const step = funnelStep(prev, status);
  if (step) await funnel(step);
  return true;
}

export interface VerifyBody {
  packageName?: unknown;
  productId?: unknown;
  purchaseToken?: unknown;
}

export async function handleVerify(deps: PlayDeps, userId: string | null, body: VerifyBody): Promise<Result> {
  if (!userId) return { status: 401, body: { error: "unauthorized" } };
  const pkg = str(body.packageName);
  const productId = str(body.productId);
  const token = str(body.purchaseToken);
  if (pkg !== PLAY_PACKAGE || !productId || !PLAY_PLANS[productId] || !token || token.length > 4096) return { status: 400, body: { error: "bad_request" } };
  const google = deps.google();
  if (!google) return { status: 503, body: { error: "unavailable" } };
  const before = await deps.store.row(token);
  if (before?.user_id && before.user_id !== userId) return { status: 409, body: { error: "token_bound" } };
  const kind: PlayKind = productId === PLAY_LIFETIME ? "inapp" : "subs";
  const rec = await fetchRecord(google, pkg, kind, productId, token);
  if (!rec) return { status: 400, body: { error: "unknown_purchase" } };
  if (rec.row.account_hash && rec.row.account_hash !== accountHash(userId)) return { status: 409, body: { error: "token_bound" } };
  if (before?.state === "refunded") rec.row.state = "refunded";
  const d0 = dayZeroCancel(rec, before);
  const row: PlayRow = { ...rec.row, user_id: userId };
  if (!(await deps.store.save(row))) return { status: 500, body: { error: "record_failed" } };
  if (rec.row.linked_purchase_token) await deps.store.replace(rec.row.linked_purchase_token);
  if (!(await applyEntitlement(deps, userId, rec, `play:${token.slice(0, 32)}:${rec.row.state}`, d0))) return { status: 500, body: { error: "record_failed" } };
  const settled = rec.row.state !== "incomplete" && rec.row.state !== "incomplete_expired";
  const acknowledged = rec.acknowledged || (settled && (await google.acknowledge(pkg, kind, rec.row.product_id, token)));
  return { status: 200, body: { ok: true, state: rec.row.state, active: entitled(rec.row.state), trial: rec.row.trial, expiresAt: rec.row.expiry, acknowledged } };
}

export interface RtdnEvent {
  pkg: string;
  token: string;
  kind: PlayKind;
  productId: string | null;
  voided: boolean;
  test: boolean;
  eventMs: number | null;
}

export function parseRtdn(body: unknown): RtdnEvent | null {
  const data = str(obj(obj(body).message).data);
  if (!data) return null;
  let n: Obj;
  try {
    n = obj(JSON.parse(Buffer.from(data, "base64").toString("utf8")));
  } catch {
    return null;
  }
  const pkg = str(n.packageName) ?? "";
  const eventMs = Number(n.eventTimeMillis);
  const base = { pkg, eventMs: Number.isFinite(eventMs) ? eventMs : null };
  if (n.testNotification) return { ...base, token: "", kind: "subs", productId: null, voided: false, test: true };
  const sub = obj(n.subscriptionNotification);
  if (str(sub.purchaseToken)) return { ...base, token: str(sub.purchaseToken) as string, kind: "subs", productId: str(sub.subscriptionId), voided: false, test: false };
  const once = obj(n.oneTimeProductNotification);
  if (str(once.purchaseToken)) return { ...base, token: str(once.purchaseToken) as string, kind: "inapp", productId: str(once.sku), voided: false, test: false };
  const voided = obj(n.voidedPurchaseNotification);
  if (str(voided.purchaseToken)) return { ...base, token: str(voided.purchaseToken) as string, kind: voided.productType === 2 ? "inapp" : "subs", productId: null, voided: true, test: false };
  return null;
}

export async function handleRtdn(deps: PlayDeps, authorized: boolean, body: unknown): Promise<Result> {
  if (!authorized) return { status: 401, body: { error: "unauthorized" } };
  const ev = parseRtdn(body);
  if (!ev || ev.test || ev.pkg !== PLAY_PACKAGE) return { status: 200, body: { received: true, ignored: true } };
  const google = deps.google();
  if (!google) return { status: 503, body: { error: "unavailable" } };
  const before = await deps.store.row(ev.token);
  const productId = before?.product_id ?? ev.productId;
  const kind = before?.kind ?? ev.kind;
  const fetched = await fetchRecord(google, ev.pkg, kind, productId, ev.token);
  const rec: PlayRecord | null = fetched ?? (before ? { row: { ...before }, acknowledged: true, cancelMs: null } : null);
  if (!rec) return { status: 200, body: { received: true, ignored: true } };
  if (ev.voided || before?.state === "refunded") rec.row.state = "refunded";
  const d0 = dayZeroCancel(rec, before);
  const userId = before?.user_id ?? null;
  if (!(await deps.store.save({ ...rec.row, user_id: userId }))) return { status: 500, body: { error: "record_failed" } };
  if (rec.row.linked_purchase_token) await deps.store.replace(rec.row.linked_purchase_token);
  if (!userId) return { status: 200, body: { received: true, unbound: true } };
  const eventId = `play:${ev.token.slice(0, 32)}:${ev.eventMs ?? deps.now()}`;
  if (!(await applyEntitlement(deps, userId, rec, eventId, d0))) return { status: 500, body: { error: "record_failed" } };
  return { status: 200, body: { received: true, state: rec.row.state } };
}
