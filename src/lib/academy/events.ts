import { MAX_EXPOSURE_SECONDS, MAX_LEMMAS, MAX_SESSION_ITEMS, MAX_TAPS, type ExposureInput } from "./learn-log";

export const LEARN_EVENT_NAMES = ["age_band_set", "placement_done", "study_session_done", "assess_done", "tutor_turn", "exposure", "session_mix"] as const;
export type LearnEventName = (typeof LEARN_EVENT_NAMES)[number];

export const CLIENT_EVENT_NAMES = ["placement_done", "study_session_done", "assess_done", "exposure", "session_mix"] as const;
export const BATCH_EVENT_NAMES = ["exposure", "session_mix"] as const;
export type BatchEventName = (typeof BATCH_EVENT_NAMES)[number];
export const MAX_BATCH_EVENTS = 400;
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];

export const EVENT_DAILY_CAPS: Record<ClientEventName, number> = { placement_done: 20, study_session_done: 60, assess_done: 30, exposure: 300, session_mix: 60 };

export const MAX_ASSESS_ITEMS = 50;
const LEVELS = ["recall", "apply", "derive", "teach"] as const;
const BANDS = ["under13", "13to17", "18plus"] as const;
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ATOM_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARM_RE = /^[a-z0-9_-]{1,32}$/;

export interface AssessItemVerdict {
  atomId: string;
  level: (typeof LEVELS)[number];
  correct: boolean;
  autoGraded: boolean;
}

export interface LearnEventProps {
  age_band_set: { band: (typeof BANDS)[number] };
  placement_done: { branch: string; questions: number; known: number };
  study_session_done: { branch: string; items: number; correct: number; seconds: number };
  assess_done: { branch: string; items: AssessItemVerdict[] };
  exposure: ExposureInput;
  session_mix: { session: string; share_target: number; share_real: number; arm: string; units: number; cards: number; seconds: number };
  tutor_turn: { atom: string; abstained: boolean; leakBlocked: boolean; inputTokens: number | null; outputTokens: number | null; costUsd: number | null };
}

export interface LearnEvent<N extends LearnEventName = LearnEventName> {
  id: string;
  name: N;
  props: LearnEventProps[N];
  arm?: string | null;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function int(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
}

function nullableNum(v: unknown): v is number | null {
  return v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);
}

const LEMMA_RE = /^\S{1,40}$/;

function share(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

function lemmaList(v: unknown, max: number): v is string[] {
  return Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && LEMMA_RE.test(x));
}

function key(v: unknown): v is string {
  return typeof v === "string" && ATOM_RE.test(v);
}

function branch(v: unknown): v is string {
  return typeof v === "string" && BRANCH_RE.test(v);
}

function parseItem(v: unknown): AssessItemVerdict | null {
  if (!isObj(v)) return null;
  if (typeof v.atomId !== "string" || !ATOM_RE.test(v.atomId)) return null;
  if (!LEVELS.includes(v.level as AssessItemVerdict["level"])) return null;
  if (typeof v.correct !== "boolean" || typeof v.autoGraded !== "boolean") return null;
  return { atomId: v.atomId, level: v.level as AssessItemVerdict["level"], correct: v.correct, autoGraded: v.autoGraded };
}

export function parseProps<N extends LearnEventName>(name: N, raw: unknown): Parsed<LearnEventProps[N]> {
  const fail = { ok: false as const, error: `bad_props:${name}` };
  if (!isObj(raw)) return fail;
  const done = (value: LearnEventProps[LearnEventName]) => ({ ok: true as const, value: value as LearnEventProps[N] });
  switch (name) {
    case "age_band_set":
      return BANDS.includes(raw.band as (typeof BANDS)[number]) ? done({ band: raw.band as (typeof BANDS)[number] }) : fail;
    case "placement_done":
      if (!branch(raw.branch) || !int(raw.questions, 500) || !int(raw.known, 10_000)) return fail;
      return done({ branch: raw.branch, questions: raw.questions, known: raw.known });
    case "study_session_done":
      if (!branch(raw.branch) || !int(raw.items, 1000) || !int(raw.correct, 1000) || !int(raw.seconds, 86_400)) return fail;
      if (raw.correct > raw.items) return fail;
      return done({ branch: raw.branch, items: raw.items, correct: raw.correct, seconds: raw.seconds });
    case "assess_done": {
      if (!branch(raw.branch) || !Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > MAX_ASSESS_ITEMS) return fail;
      const items = raw.items.map(parseItem);
      if (items.some((i) => i === null)) return fail;
      return done({ branch: raw.branch, items: items as AssessItemVerdict[] });
    }
    case "exposure":
      if (!key(raw.item) || !key(raw.unit) || !lemmaList(raw.lemmas_seen, MAX_LEMMAS) || !lemmaList(raw.taps, MAX_TAPS)) return fail;
      if (!int(raw.seconds, MAX_EXPOSURE_SECONDS) || !share(raw.coverage_pred) || typeof raw.completed !== "boolean") return fail;
      return done({ item: raw.item, unit: raw.unit, lemmas_seen: raw.lemmas_seen, taps: raw.taps, seconds: raw.seconds, coverage_pred: raw.coverage_pred, completed: raw.completed });
    case "session_mix":
      if (!key(raw.session) || !share(raw.share_target) || !share(raw.share_real) || !validArm(raw.arm)) return fail;
      if (!int(raw.units, MAX_SESSION_ITEMS) || !int(raw.cards, MAX_SESSION_ITEMS) || !int(raw.seconds, 86_400)) return fail;
      return done({ session: raw.session, share_target: raw.share_target, share_real: raw.share_real, arm: raw.arm, units: raw.units, cards: raw.cards, seconds: raw.seconds });
    case "tutor_turn":
      if (typeof raw.atom !== "string" || !ATOM_RE.test(raw.atom)) return fail;
      if (typeof raw.abstained !== "boolean" || typeof raw.leakBlocked !== "boolean") return fail;
      if (!nullableNum(raw.inputTokens) || !nullableNum(raw.outputTokens) || !nullableNum(raw.costUsd)) return fail;
      return done({ atom: raw.atom, abstained: raw.abstained, leakBlocked: raw.leakBlocked, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, costUsd: raw.costUsd });
    default:
      return fail;
  }
}

export function parseClientEvent(raw: unknown): Parsed<LearnEvent<ClientEventName>> {
  if (!isObj(raw)) return { ok: false, error: "bad_request" };
  if (typeof raw.id !== "string" || !UUID_RE.test(raw.id)) return { ok: false, error: "bad_id" };
  if (!CLIENT_EVENT_NAMES.includes(raw.name as ClientEventName)) return { ok: false, error: "bad_name" };
  const name = raw.name as ClientEventName;
  const props = parseProps(name, raw.props);
  if (!props.ok) return props;
  return { ok: true, value: { id: raw.id.toLowerCase(), name, props: props.value } };
}

export function validArm(arm: unknown): arm is string {
  return typeof arm === "string" && ARM_RE.test(arm);
}

export function parseClientBatch(raw: unknown): Parsed<LearnEvent<BatchEventName>[]> {
  if (!isObj(raw) || !Array.isArray(raw.events) || raw.events.length > MAX_BATCH_EVENTS) return { ok: false, error: "bad_batch" };
  const out: LearnEvent<BatchEventName>[] = [];
  const seen = new Set<string>();
  for (const e of raw.events) {
    if (!isObj(e) || !BATCH_EVENT_NAMES.includes(e.name as BatchEventName)) return { ok: false, error: "bad_name" };
    const parsed = parseClientEvent(e);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.value.id)) return { ok: false, error: "duplicate_id" };
    seen.add(parsed.value.id);
    out.push(parsed.value as LearnEvent<BatchEventName>);
  }
  return { ok: true, value: out };
}
