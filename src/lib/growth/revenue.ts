export const REVENUE_PRODUCTS = ["com.polingual.monthly", "com.polingual.yearly", "com.polingual.family.yearly", "com.polingual.lifetime"] as const;
export const REVENUE_LIMITS = { maxRows: 5000, maxDays: 90, maxNotes: 10, maxNoteLength: 200, maxKnown: 50 } as const;

export interface SalesRow {
  day: string;
  sku: string;
  kind: "app" | "product";
  units: number;
  proceeds: number;
  currency: string;
}

export interface SubscriptionRow {
  sku: string;
  standard: number;
  trial: number;
  introPaid: number;
  promo: number;
  offerCode: number;
  billingRetry: number;
  grace: number;
}

export interface SubscriptionEventRow {
  day: string;
  sku: string;
  event: string;
  offer: string;
  quantity: number;
}

export interface SnapshotRevenue {
  days: number;
  known: string[];
  sales: { days: string[]; rows: SalesRow[] } | null;
  subscriptions: { day: string; rows: SubscriptionRow[] } | null;
  events: { days: string[]; rows: SubscriptionEventRow[] } | null;
  notes: string[];
}

export interface Money {
  currency: string;
  amount: number;
}

export interface ProductRevenue {
  sku: string;
  inAppStoreConnect: boolean;
  units: number | null;
  proceeds: Money[] | null;
  active: number | null;
  trial: number | null;
  offerCode: number | null;
}

export interface RevenueDay {
  day: string;
  appUnits: number | null;
  units: Record<string, number> | null;
  proceeds: Money[] | null;
  trialsStarted: number | null;
  trialsConverted: number | null;
  offerCodeRedemptions: number | null;
}

export interface RevenueReport {
  windowDays: number | null;
  notes: string[];
  proceeds: Money[] | null;
  units: number | null;
  appUnits: number | null;
  activeSubscriptions: number | null;
  activeAsOf: string | null;
  trialsStarted: number | null;
  trialsConverted: number | null;
  offerCodeRedemptions: number | null;
  products: ProductRevenue[];
  daily: RevenueDay[];
  events: { event: string; quantity: number }[] | null;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SKU_RE = /^[A-Za-z0-9._-]{1,80}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const TRIAL_START_RE = /^start introductory (offer|price)$/i;
const TRIAL_PAID_RE = /^paid subscription from introductory (offer|price)$/i;
const OFFER_CODE_RE = /offer code/i;
const OFFER_CODE_START_RE = /^(start|redeem|reactivate|upgrade|downgrade|crossgrade)/i;

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function int(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= 1e9;
}

function count(v: unknown): v is number {
  return int(v) && v >= 0;
}

function day(v: unknown): v is string {
  return typeof v === "string" && DAY_RE.test(v);
}

function sku(v: unknown): v is string {
  return typeof v === "string" && SKU_RE.test(v);
}

function dayList(v: unknown): string[] | null {
  return Array.isArray(v) && v.length <= REVENUE_LIMITS.maxDays && v.every(day) ? (v as string[]) : null;
}

function rowList<T>(v: unknown, parse: (r: Record<string, unknown>) => T | null): T[] | null {
  if (!Array.isArray(v) || v.length > REVENUE_LIMITS.maxRows) return null;
  const out: T[] = [];
  for (const r of v) {
    const parsed = isObj(r) ? parse(r) : null;
    if (!parsed) return null;
    out.push(parsed);
  }
  return out;
}

function salesRow(r: Record<string, unknown>): SalesRow | null {
  if (!day(r.day) || !(r.sku === "app" || sku(r.sku)) || !(r.kind === "app" || r.kind === "product")) return null;
  if (!int(r.units) || typeof r.proceeds !== "number" || !Number.isFinite(r.proceeds) || Math.abs(r.proceeds) > 1e9) return null;
  if (typeof r.currency !== "string" || !(r.currency === "" || CURRENCY_RE.test(r.currency))) return null;
  return { day: r.day, sku: r.sku as string, kind: r.kind, units: r.units, proceeds: r.proceeds, currency: r.currency };
}

function subscriptionRow(r: Record<string, unknown>): SubscriptionRow | null {
  if (!sku(r.sku)) return null;
  const fields = ["standard", "trial", "introPaid", "promo", "offerCode", "billingRetry", "grace"] as const;
  if (!fields.every((f) => count(r[f]))) return null;
  return { sku: r.sku, standard: r.standard as number, trial: r.trial as number, introPaid: r.introPaid as number, promo: r.promo as number, offerCode: r.offerCode as number, billingRetry: r.billingRetry as number, grace: r.grace as number };
}

function eventRow(r: Record<string, unknown>): SubscriptionEventRow | null {
  if (!day(r.day) || !sku(r.sku) || !int(r.quantity)) return null;
  if (typeof r.event !== "string" || r.event.length < 1 || r.event.length > 80) return null;
  if (typeof r.offer !== "string" || r.offer.length > 40) return null;
  return { day: r.day, sku: r.sku, event: r.event, offer: r.offer, quantity: r.quantity };
}

export function parseRevenue(v: unknown): SnapshotRevenue | null | undefined {
  if (v === undefined || v === null) return null;
  if (!isObj(v) || !int(v.days) || v.days < 1 || v.days > REVENUE_LIMITS.maxDays) return undefined;
  if (!Array.isArray(v.known) || v.known.length > REVENUE_LIMITS.maxKnown || !v.known.every(sku)) return undefined;
  if (!Array.isArray(v.notes) || v.notes.length > REVENUE_LIMITS.maxNotes || !v.notes.every((n) => typeof n === "string")) return undefined;
  const out: SnapshotRevenue = { days: v.days, known: v.known as string[], sales: null, subscriptions: null, events: null, notes: (v.notes as string[]).map((n) => n.slice(0, REVENUE_LIMITS.maxNoteLength)) };
  if (v.sales !== null && v.sales !== undefined) {
    const days = isObj(v.sales) ? dayList(v.sales.days) : null;
    const rows = isObj(v.sales) ? rowList(v.sales.rows, salesRow) : null;
    if (!days || !rows) return undefined;
    out.sales = { days, rows };
  }
  if (v.subscriptions !== null && v.subscriptions !== undefined) {
    const rows = isObj(v.subscriptions) ? rowList(v.subscriptions.rows, subscriptionRow) : null;
    if (!isObj(v.subscriptions) || !day(v.subscriptions.day) || !rows) return undefined;
    out.subscriptions = { day: v.subscriptions.day, rows };
  }
  if (v.events !== null && v.events !== undefined) {
    const days = isObj(v.events) ? dayList(v.events.days) : null;
    const rows = isObj(v.events) ? rowList(v.events.rows, eventRow) : null;
    if (!days || !rows) return undefined;
    out.events = { days, rows };
  }
  return out;
}

function addMoney(into: Map<string, number>, r: SalesRow) {
  if (r.proceeds === 0 && !r.currency) return;
  into.set(r.currency || "unknown currency", (into.get(r.currency || "unknown currency") ?? 0) + r.proceeds);
}

function money(m: Map<string, number>): Money[] {
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }));
}

export function activeOf(r: SubscriptionRow): number {
  return r.standard + r.trial + r.introPaid + r.promo + r.offerCode;
}

export function isTrialStart(e: SubscriptionEventRow): boolean {
  return TRIAL_START_RE.test(e.event) && (e.offer === "" || /free trial/i.test(e.offer));
}

export function isTrialConversion(e: SubscriptionEventRow): boolean {
  return TRIAL_PAID_RE.test(e.event);
}

export function isOfferCodeRedemption(e: SubscriptionEventRow): boolean {
  return OFFER_CODE_RE.test(e.event) && OFFER_CODE_START_RE.test(e.event);
}

function sumEvents(rows: SubscriptionEventRow[], pick: (e: SubscriptionEventRow) => boolean): number {
  return rows.filter(pick).reduce((n, e) => n + e.quantity, 0);
}

export function buildRevenueReport(rev: SnapshotRevenue | null | undefined): RevenueReport {
  const sales = rev?.sales ?? null;
  const subs = rev?.subscriptions ?? null;
  const events = rev?.events ?? null;
  const known = new Set(rev?.known ?? []);
  const skus = [...REVENUE_PRODUCTS, ...Array.from(new Set([...(sales?.rows.filter((r) => r.kind === "product").map((r) => r.sku) ?? []), ...(subs?.rows.map((r) => r.sku) ?? [])])).filter((s) => !(REVENUE_PRODUCTS as readonly string[]).includes(s)).sort()];
  const total = new Map<string, number>();
  for (const r of sales?.rows ?? []) addMoney(total, r);
  const products = skus.map((s): ProductRevenue => {
    const mine = sales?.rows.filter((r) => r.kind === "product" && r.sku === s) ?? [];
    const proceeds = new Map<string, number>();
    for (const r of mine) addMoney(proceeds, r);
    const sub = subs?.rows.find((r) => r.sku === s);
    const inAsc = known.has(s) || mine.length > 0 || Boolean(sub);
    return {
      sku: s,
      inAppStoreConnect: inAsc,
      units: sales && inAsc ? mine.reduce((n, r) => n + r.units, 0) : null,
      proceeds: sales && inAsc ? money(proceeds) : null,
      active: subs && inAsc ? (sub ? activeOf(sub) : 0) : null,
      trial: subs && inAsc ? (sub?.trial ?? 0) : null,
      offerCode: subs && inAsc ? (sub?.offerCode ?? 0) : null,
    };
  });
  const days = Array.from(new Set([...(sales?.days ?? []), ...(events?.days ?? [])])).sort().reverse();
  const daily = days.map((d): RevenueDay => {
    const hasSales = Boolean(sales?.days.includes(d));
    const hasEvents = Boolean(events?.days.includes(d));
    const rows = sales?.rows.filter((r) => r.day === d) ?? [];
    const evs = events?.rows.filter((r) => r.day === d) ?? [];
    const proceeds = new Map<string, number>();
    const units: Record<string, number> = {};
    for (const r of rows) {
      addMoney(proceeds, r);
      if (r.kind === "product") units[r.sku] = (units[r.sku] ?? 0) + r.units;
    }
    return {
      day: d,
      appUnits: hasSales ? rows.filter((r) => r.kind === "app").reduce((n, r) => n + r.units, 0) : null,
      units: hasSales ? units : null,
      proceeds: hasSales ? money(proceeds) : null,
      trialsStarted: hasEvents ? sumEvents(evs, isTrialStart) : null,
      trialsConverted: hasEvents ? sumEvents(evs, isTrialConversion) : null,
      offerCodeRedemptions: hasEvents ? sumEvents(evs, isOfferCodeRedemption) : null,
    };
  });
  const byEvent = new Map<string, number>();
  for (const e of events?.rows ?? []) byEvent.set(e.event, (byEvent.get(e.event) ?? 0) + e.quantity);
  return {
    windowDays: rev?.days ?? null,
    notes: rev?.notes ?? [],
    proceeds: sales ? money(total) : null,
    units: sales ? sales.rows.filter((r) => r.kind === "product").reduce((n, r) => n + r.units, 0) : null,
    appUnits: sales ? sales.rows.filter((r) => r.kind === "app").reduce((n, r) => n + r.units, 0) : null,
    activeSubscriptions: subs ? subs.rows.reduce((n, r) => n + activeOf(r), 0) : null,
    activeAsOf: subs?.day ?? null,
    trialsStarted: events ? sumEvents(events.rows, isTrialStart) : null,
    trialsConverted: events ? sumEvents(events.rows, isTrialConversion) : null,
    offerCodeRedemptions: events ? sumEvents(events.rows, isOfferCodeRedemption) : null,
    products,
    daily,
    events: events ? Array.from(byEvent.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([event, quantity]) => ({ event, quantity })) : null,
  };
}
