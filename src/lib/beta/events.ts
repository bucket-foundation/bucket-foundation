import type { Question } from "../academy/question-types";

export const BETA_APPS = ["bucket", "polingual", "web"] as const;
export type BetaApp = (typeof BETA_APPS)[number];

export const BETA_EVENT_NAMES = ["app_open", "session_start", "session_end", "card_shown", "card_answered", "lesson_complete"] as const;
export type BetaEventName = (typeof BETA_EVENT_NAMES)[number];

export const BETA_LIMITS = {
  maxBodyBytes: 262_144,
  maxEvents: 100,
  maxPropsBytes: 2048,
  maxPropKeys: 16,
  maxStringLength: 128,
  dailyCap: 5000,
  maxAgeDays: 30,
  maxFutureSeconds: 300,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;
const BANNED_KEYS = new Set(["ip", "ip_address", "idfa", "idfv", "device_id", "advertising_id", "email", "phone", "lat", "lng", "latitude", "longitude", "location"]);

export type PropValue = string | number | boolean | null;

export interface BetaEvent {
  id: string;
  name: BetaEventName;
  ts: string;
  sessionId: string | null;
  props: Record<string, PropValue>;
}

export interface BetaBatch {
  app: BetaApp;
  events: BetaEvent[];
  rejected: { index: number; error: string }[];
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function parseProps(raw: unknown): Parsed<Record<string, PropValue>> {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (!isObj(raw)) return { ok: false, error: "bad_props" };
  const keys = Object.keys(raw);
  if (keys.length > BETA_LIMITS.maxPropKeys) return { ok: false, error: "too_many_props" };
  const out: Record<string, PropValue> = {};
  for (const k of keys) {
    if (!KEY_RE.test(k)) return { ok: false, error: "bad_prop_key" };
    if (BANNED_KEYS.has(k)) return { ok: false, error: "forbidden_prop" };
    const v = raw[k];
    if (typeof v === "string") {
      if (v.length > BETA_LIMITS.maxStringLength) return { ok: false, error: "prop_too_long" };
      out[k] = v;
    } else if (typeof v === "number") {
      if (!Number.isFinite(v)) return { ok: false, error: "bad_prop_value" };
      out[k] = v;
    } else if (typeof v === "boolean" || v === null) {
      out[k] = v;
    } else {
      return { ok: false, error: "bad_prop_value" };
    }
  }
  if (Buffer.byteLength(JSON.stringify(out), "utf8") > BETA_LIMITS.maxPropsBytes) return { ok: false, error: "props_too_large" };
  return { ok: true, value: out };
}

export function parseEvent(raw: unknown, now: Date): Parsed<BetaEvent> {
  if (!isObj(raw)) return { ok: false, error: "bad_event" };
  if (typeof raw.id !== "string" || !UUID_RE.test(raw.id)) return { ok: false, error: "bad_id" };
  if (!BETA_EVENT_NAMES.includes(raw.name as BetaEventName)) return { ok: false, error: "bad_name" };
  if (typeof raw.ts !== "string") return { ok: false, error: "bad_ts" };
  const t = Date.parse(raw.ts);
  if (!Number.isFinite(t)) return { ok: false, error: "bad_ts" };
  if (t > now.getTime() + BETA_LIMITS.maxFutureSeconds * 1000) return { ok: false, error: "ts_in_future" };
  if (t < now.getTime() - BETA_LIMITS.maxAgeDays * 86_400_000) return { ok: false, error: "ts_too_old" };
  let sessionId: string | null = null;
  if (raw.session_id !== undefined && raw.session_id !== null) {
    if (typeof raw.session_id !== "string" || !UUID_RE.test(raw.session_id)) return { ok: false, error: "bad_session_id" };
    sessionId = raw.session_id.toLowerCase();
  }
  const props = parseProps(raw.props);
  if (!props.ok) return props;
  return { ok: true, value: { id: raw.id.toLowerCase(), name: raw.name as BetaEventName, ts: new Date(t).toISOString(), sessionId, props: props.value } };
}

export function parseBatch(raw: unknown, now: Date = new Date()): Parsed<BetaBatch> {
  if (!isObj(raw)) return { ok: false, error: "bad_request" };
  if (!BETA_APPS.includes(raw.app as BetaApp)) return { ok: false, error: "bad_app" };
  if (!Array.isArray(raw.events) || raw.events.length === 0) return { ok: false, error: "no_events" };
  if (raw.events.length > BETA_LIMITS.maxEvents) return { ok: false, error: "too_many_events" };
  const events: BetaEvent[] = [];
  const rejected: { index: number; error: string }[] = [];
  const seen = new Set<string>();
  raw.events.forEach((e, index) => {
    const p = parseEvent(e, now);
    if (!p.ok) rejected.push({ index, error: p.error });
    else if (seen.has(p.value.id)) rejected.push({ index, error: "duplicate_in_batch" });
    else {
      seen.add(p.value.id);
      events.push(p.value);
    }
  });
  return { ok: true, value: { app: raw.app as BetaApp, events, rejected } };
}

export function answeredProps(deck: string, correct: boolean, ms: number, kind: string, question?: Question): Record<string, PropValue> {
  const props: Record<string, PropValue> = { deck, correct, ms, kind };
  if (question) {
    props.question_kind = question.kind;
    props.applied = question.applied === true;
  }
  return props;
}
