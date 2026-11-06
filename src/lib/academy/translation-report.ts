export const REPORT_REASONS = ["meaning", "spelling", "sound", "script"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MAX_REPORT_BYTES = 4_096;
export const LIMITS = { item: 120, text: 400, shown: 400, suggestion: 400, context: 40 } as const;
export const RATE = {
  user: { limit: 40, windowSeconds: 3600 },
  device: { limit: 20, windowSeconds: 3600 },
  ip: { limit: 60, windowSeconds: 3600 },
  anonymous: { limit: 600, windowSeconds: 3600 },
} as const;
export const RETENTION_DAYS = 180;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const CONTEXT_RE = /^[A-Za-z0-9:_-]+$/;

export interface TranslationReport {
  id: string;
  lang: string;
  root: string | null;
  itemId: string | null;
  text: string | null;
  shown: string;
  reason: ReportReason;
  suggestion: string | null;
  context: string | null;
  deviceId: string | null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function clean(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (s.length === 0) return null;
  return Array.from(s).length > max ? undefined : s;
}

export function parseTranslationReport(raw: unknown): Parsed<TranslationReport> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "bad_request" };
  const b = raw as Record<string, unknown>;
  if (typeof b.id !== "string" || !UUID_RE.test(b.id)) return { ok: false, error: "bad_id" };
  if (typeof b.lang !== "string" || !LANG_RE.test(b.lang)) return { ok: false, error: "bad_lang" };
  const root = b.root === undefined || b.root === null ? null : typeof b.root === "string" && LANG_RE.test(b.root) ? b.root : undefined;
  if (root === undefined) return { ok: false, error: "bad_lang" };
  if (typeof b.reason !== "string" || !(REPORT_REASONS as readonly string[]).includes(b.reason)) return { ok: false, error: "bad_reason" };
  const itemId = clean(b.item_id, LIMITS.item);
  const text = clean(b.text, LIMITS.text);
  const shown = clean(b.shown, LIMITS.shown);
  const suggestion = clean(b.suggestion, LIMITS.suggestion);
  const context = clean(b.context, LIMITS.context);
  if (itemId === undefined || text === undefined || shown === undefined || suggestion === undefined || context === undefined) return { ok: false, error: "too_long" };
  if (!itemId && !text) return { ok: false, error: "missing_item" };
  if (!shown) return { ok: false, error: "missing_shown" };
  if (context && !CONTEXT_RE.test(context)) return { ok: false, error: "bad_context" };
  const deviceId = b.device_id === undefined || b.device_id === null ? null : typeof b.device_id === "string" && UUID_RE.test(b.device_id) ? b.device_id.toLowerCase() : undefined;
  if (deviceId === undefined) return { ok: false, error: "bad_device" };
  return {
    ok: true,
    value: { id: b.id.toLowerCase(), lang: b.lang, root, itemId, text, shown, reason: b.reason as ReportReason, suggestion, context, deviceId },
  };
}

export interface TranslationReportRow {
  id: string;
  lang: string;
  root: string | null;
  item_id: string | null;
  text: string | null;
  shown: string;
  reason: ReportReason;
  suggestion: string | null;
  context: string | null;
  user_id: string | null;
  device_id: string | null;
}

export interface StoredTranslationReport extends TranslationReportRow {
  created_at: string;
  resolved_at: string | null;
}

export type ReportWrite = "recorded" | "duplicate";

export interface TranslationReportStore {
  exists: (id: string) => Promise<boolean>;
  hit: (key: string, limit: number, windowSeconds: number) => Promise<number>;
  insert: (row: TranslationReportRow) => Promise<ReportWrite>;
}

export interface Reporter {
  userId: string | null;
  ip: string | null;
}

export type ReportOutcome =
  | { outcome: ReportWrite }
  | { outcome: "rate_limited"; retryAfterSeconds: number }
  | { outcome: "anonymous_needs_device" };

export type RateKey = { key: string; limit: number; windowSeconds: number };

export function rateKeys(report: TranslationReport, who: Reporter): RateKey[] {
  const ip = who.ip && who.ip !== "unknown" ? who.ip : null;
  if (who.userId) return [{ key: `tr:u:${who.userId}`, ...RATE.user }, ...(ip ? [{ key: `tr:ip:${ip}`, ...RATE.ip }] : [])];
  return [
    ...(report.deviceId ? [{ key: `tr:d:${report.deviceId}`, ...RATE.device }] : []),
    { key: `tr:ip:${ip ?? "unknown"}`, ...RATE.ip },
    { key: "tr:anon", ...RATE.anonymous },
  ];
}

export async function recordTranslationReport(store: TranslationReportStore, report: TranslationReport, who: Reporter): Promise<ReportOutcome> {
  if (!who.userId && !report.deviceId) return { outcome: "anonymous_needs_device" };
  if (await store.exists(report.id)) return { outcome: "duplicate" };
  for (const k of rateKeys(report, who)) {
    const wait = await store.hit(k.key, k.limit, k.windowSeconds);
    if (wait > 0) return { outcome: "rate_limited", retryAfterSeconds: Math.min(Math.max(1, Math.ceil(wait)), k.windowSeconds) };
  }
  const outcome = await store.insert({
    id: report.id,
    lang: report.lang,
    root: report.root,
    item_id: report.itemId,
    text: report.text,
    shown: report.shown,
    reason: report.reason,
    suggestion: report.suggestion,
    context: report.context,
    user_id: who.userId,
    device_id: report.deviceId,
  });
  return { outcome };
}
