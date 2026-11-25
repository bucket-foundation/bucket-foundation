import type { Card, Rating } from "./fsrs";
import type { Depth } from "./engine";
import { parseCardId } from "./lang-systems";
import { orderLog } from "./replay";

export const MAX_LEMMAS = 200;
export const MAX_TAPS = 50;
export const MAX_EXPOSURE_SECONDS = 3600;
export const MAX_SESSION_ITEMS = 1000;
export const MAX_PENDING_ROWS = 400;
export const GATE_RECHECK_MS = 86_400_000;

const LEMMA_RE = /^\S{1,40}$/;
const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const ARM_RE = /^[a-z0-9_-]{1,32}$/;
const LANG_RE = /^[a-z]{2,3}$/;
const DAY_MS = 86_400_000;

interface RowBase {
  review_id: string;
  reviewed_at: number;
  device_id: string;
  tz: string;
  system_id: string;
}

export interface ReviewMetrics {
  elapsedDays: number;
  S_before: number;
  S_after: number;
  D: number;
}

export interface ReviewLogRow extends RowBase, Partial<ReviewMetrics> {
  kind?: "review";
  card_id: string;
  rating: Rating;
  level: Depth;
  atoms_version: string;
}

export interface ExposureRow extends RowBase {
  kind: "exposure";
  lang: string;
  item: string;
  unit: string;
  lemmas_seen: string[];
  taps: string[];
  seconds: number;
  coverage_pred: number;
  completed: boolean;
}

export interface SessionRow extends RowBase {
  kind: "session";
  lang: string;
  id: string;
  started: number;
  ended: number;
  share_target: number;
  share_real: number;
  arm: string;
  units: number;
  cards: number;
}

export type LogRow = ReviewLogRow | ExposureRow | SessionRow;

export function isReview(r: LogRow): r is ReviewLogRow {
  return r.kind === undefined || r.kind === "review";
}

export function rowLang(r: LogRow): string {
  return isReview(r) ? parseCardId(r.card_id).lang : r.lang;
}

const str = (v: unknown, max = 128): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const nat = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const unit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const pos = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const lemmas = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && LEMMA_RE.test(x));

function base(o: Record<string, unknown>): RowBase | null {
  if (!str(o.review_id) || !str(o.device_id, 64) || !str(o.tz, 64) || typeof o.system_id !== "string") return null;
  if (typeof o.reviewed_at !== "number" || !Number.isFinite(o.reviewed_at)) return null;
  return { review_id: o.review_id, reviewed_at: o.reviewed_at, device_id: o.device_id, tz: o.tz, system_id: o.system_id };
}

export function parseLogRow(raw: unknown): LogRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const b = base(o);
  if (!b) return null;
  if (o.kind === undefined || o.kind === "review") {
    if (!str(o.card_id, 256) || typeof o.rating !== "number" || ![1, 2, 3, 4].includes(o.rating) || typeof o.level !== "string" || typeof o.atoms_version !== "string") return null;
    const row: ReviewLogRow = { ...b, card_id: o.card_id, rating: o.rating as Rating, level: o.level as Depth, atoms_version: o.atoms_version };
    if (o.kind === "review") row.kind = "review";
    if (pos(o.elapsedDays) && pos(o.S_before) && pos(o.S_after) && pos(o.D)) Object.assign(row, { elapsedDays: o.elapsedDays, S_before: o.S_before, S_after: o.S_after, D: o.D });
    return row;
  }
  if (!str(o.lang, 3) || !LANG_RE.test(o.lang)) return null;
  if (o.kind === "exposure") {
    if (!str(o.item) || !KEY_RE.test(o.item) || !str(o.unit) || !KEY_RE.test(o.unit)) return null;
    if (!lemmas(o.lemmas_seen, MAX_LEMMAS) || !lemmas(o.taps, MAX_TAPS)) return null;
    if (!nat(o.seconds, MAX_EXPOSURE_SECONDS) || !unit(o.coverage_pred) || typeof o.completed !== "boolean") return null;
    return { ...b, kind: "exposure", lang: o.lang, item: o.item, unit: o.unit, lemmas_seen: o.lemmas_seen, taps: o.taps, seconds: o.seconds, coverage_pred: o.coverage_pred, completed: o.completed };
  }
  if (o.kind === "session") {
    if (!str(o.id) || typeof o.started !== "number" || typeof o.ended !== "number" || !(o.ended >= o.started)) return null;
    if (!unit(o.share_target) || !unit(o.share_real) || !str(o.arm, 32) || !ARM_RE.test(o.arm)) return null;
    if (!nat(o.units, MAX_SESSION_ITEMS) || !nat(o.cards, MAX_SESSION_ITEMS)) return null;
    return { ...b, kind: "session", lang: o.lang, id: o.id, started: o.started, ended: o.ended, share_target: o.share_target, share_real: o.share_real, arm: o.arm, units: o.units, cards: o.cards };
  }
  return null;
}

export function orderRows<T extends LogRow>(rows: readonly T[]): T[] {
  return orderLog(rows);
}

export interface CardSummary {
  reps: number;
  lapses: number;
  stability: number | null;
  difficulty: number | null;
  lastReview: number;
}

export function replaySummary(raw: readonly unknown[]): { accepted: string[]; cards: Record<string, CardSummary> } {
  const rows = orderRows(raw.map(parseLogRow).filter((r): r is LogRow => r !== null));
  const cards: Record<string, CardSummary> = {};
  for (const r of rows) {
    if (!isReview(r)) continue;
    const c = cards[r.card_id] ?? { reps: 0, lapses: 0, stability: null, difficulty: null, lastReview: 0 };
    cards[r.card_id] = {
      reps: c.reps + 1,
      lapses: c.lapses + (r.rating === 1 ? 1 : 0),
      stability: r.S_after ?? c.stability,
      difficulty: r.D ?? c.difficulty,
      lastReview: r.reviewed_at,
    };
  }
  return { accepted: rows.map((r) => r.review_id), cards };
}

const round = (x: number) => Math.round(x * 1e6) / 1e6;

export function reviewMetrics(before: Card | undefined, after: Card | undefined, now: number): ReviewMetrics | null {
  if (!after || typeof after.stability !== "number" || typeof after.difficulty !== "number") return null;
  const last = before?.lastReview ?? null;
  return {
    elapsedDays: round(last ? Math.max(0, (now - last) / DAY_MS) : 0),
    S_before: round(typeof before?.stability === "number" ? before.stability : 0),
    S_after: round(after.stability),
    D: round(after.difficulty),
  };
}

export interface ExposureInput {
  item: string;
  unit: string;
  lemmas_seen: string[];
  taps: string[];
  seconds: number;
  coverage_pred: number;
  completed: boolean;
}

export interface SessionInput {
  id: string;
  started: number;
  ended: number;
  share_target: number;
  share_real: number;
  arm: string;
  units: number;
  cards: number;
}

export type BatchEvent =
  | { id: string; name: "exposure"; props: ExposureInput }
  | { id: string; name: "session_mix"; props: { session: string; share_target: number; share_real: number; arm: string; units: number; cards: number; seconds: number } };

export function batchEvents(rows: readonly LogRow[]): BatchEvent[] {
  const out: BatchEvent[] = [];
  for (const r of orderRows(rows)) {
    if (r.kind === "exposure") out.push({ id: r.review_id, name: "exposure", props: { item: r.item, unit: r.unit, lemmas_seen: r.lemmas_seen, taps: r.taps, seconds: r.seconds, coverage_pred: r.coverage_pred, completed: r.completed } });
    else if (r.kind === "session") out.push({ id: r.review_id, name: "session_mix", props: { session: r.id, share_target: r.share_target, share_real: r.share_real, arm: r.arm, units: r.units, cards: r.cards, seconds: Math.min(86_400, Math.round((r.ended - r.started) / 1000)) } });
  }
  return out;
}

export type GateState = "unknown" | "open" | "closed";

export interface UploadGate {
  state: GateState;
  at: number;
}

export function shareable<T extends LogRow>(rows: readonly T[], gate: UploadGate): T[] {
  return gate.state === "open" ? [...rows] : rows.filter(isReview);
}

export function shouldProbe(gate: UploadGate, now: number): boolean {
  return gate.state === "closed" && now - gate.at >= GATE_RECHECK_MS;
}

export type GateReply = "recorded" | "under_age" | "no_consent" | "no_profile" | "retry";

export function nextGate(reply: GateReply, gate: UploadGate, now: number): UploadGate {
  if (reply === "recorded") return { state: "open", at: now };
  if (reply === "under_age" || reply === "no_consent") return { state: "closed", at: now };
  return gate;
}
