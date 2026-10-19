import { createHash } from "node:crypto";
import type { BirthYearBucket } from "../research-os/consent";
import { decideLearnWrite } from "../research-os/learn-gate";
import type { Atom, Depth, EngineState } from "./engine";
import type { Rating } from "./fsrs";
import { replay, type ReviewRow } from "./replay";

export const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
export const MIN_REVIEWED_AT = Date.UTC(2020, 0, 1);
export const MAX_BATCH = 200;
export const MAX_PULL = 500;

export const DEFAULT_ORIGINS = ["capacitor://localhost", "tauri://localhost", "http://tauri.localhost", "https://bucket.foundation", "https://www.bucket.foundation", "https://polingual.com", "https://www.polingual.com"];

const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const DEVICE_RE = /^[A-Za-z0-9._-]{1,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LEVELS: readonly Depth[] = ["recall", "apply", "derive", "teach"];

export interface ReviewInput {
  review_id: string;
  branch: string;
  card_id: string;
  rating: Rating;
  level: Depth;
  reviewed_at: number;
  tz: string;
  atoms_version: string;
  device_id: string;
}

export interface AppendRow {
  review_id: string;
  branch: string;
  card_id: string;
  rating: Rating;
  level: Depth;
  reviewed_at: string;
  tz: string;
  atoms_version: string;
  device_id: string;
  payload_hash: string;
}

export type AppendStatus = "inserted" | "duplicate" | "conflict";

export interface AppendResult {
  review_id: string;
  status: AppendStatus;
  seq: number;
}

export interface StoredReview extends ReviewRow {
  branch: string;
  seq: number;
}

export interface ReviewLogDeps {
  enabled: () => boolean;
  configured: () => boolean;
  origins: () => readonly string[];
  now: () => number;
  verifyUser: (req: Request) => Promise<string | null>;
  readAgeBand: (uid: string) => Promise<{ ok: true; band: BirthYearBucket | null } | { ok: false }>;
  appendReviews: (uid: string, rows: AppendRow[]) => Promise<AppendResult[]>;
  readLog: (uid: string, sinceSeq: number, limit: number) => Promise<StoredReview[]>;
  readBranch: (uid: string, branch: string) => Promise<{ baseline: EngineState | null; rows: StoredReview[] }>;
  writeFold: (uid: string, branch: string, data: EngineState, seq: number) => Promise<boolean>;
  syncMastery: (uid: string, branch: string, data: unknown) => Promise<{ advanced: number }>;
  atoms: () => Readonly<Record<string, Atom[]>>;
}

export function payloadHash(r: ReviewInput): string {
  const canon = JSON.stringify([r.branch, r.card_id, r.rating, r.level, r.reviewed_at, r.tz, r.atoms_version, r.device_id]);
  return createHash("sha256").update(canon).digest("hex");
}

export function clampReviewedAt(reviewedAt: number, now: number): number {
  return reviewedAt > now + MAX_FUTURE_MS ? now : reviewedAt;
}

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

export function parseReview(v: unknown): ReviewInput | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!str(o.review_id, 36) || !UUID_RE.test(o.review_id.toLowerCase())) return null;
  if (!str(o.branch, 64) || !BRANCH_RE.test(o.branch)) return null;
  if (!str(o.card_id, 256)) return null;
  if (o.rating !== 1 && o.rating !== 2 && o.rating !== 3 && o.rating !== 4) return null;
  const level = o.level === undefined ? "recall" : o.level;
  if (!LEVELS.includes(level as Depth)) return null;
  if (typeof o.reviewed_at !== "number" || !Number.isInteger(o.reviewed_at) || o.reviewed_at < MIN_REVIEWED_AT) return null;
  if (!str(o.tz, 64) || !str(o.atoms_version, 64)) return null;
  if (!str(o.device_id, 64) || !DEVICE_RE.test(o.device_id)) return null;
  return {
    review_id: o.review_id.toLowerCase(),
    branch: o.branch,
    card_id: o.card_id,
    rating: o.rating,
    level: level as Depth,
    reviewed_at: o.reviewed_at,
    tz: o.tz,
    atoms_version: o.atoms_version,
    device_id: o.device_id,
  };
}

export function toAppendRow(r: ReviewInput, now: number): AppendRow {
  return { ...r, reviewed_at: new Date(clampReviewedAt(r.reviewed_at, now)).toISOString(), payload_hash: payloadHash(r) };
}

export function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> {
  const h: Record<string, string> = { "cache-control": "no-store", vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    h["access-control-allow-origin"] = origin;
    h["access-control-allow-methods"] = "GET, POST, OPTIONS";
    h["access-control-allow-headers"] = "authorization, content-type";
    h["access-control-max-age"] = "600";
  }
  return h;
}

export function createReviewLogHandlers(deps: ReviewLogDeps) {
  const respond = (req: Request, body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...corsHeaders(req.headers.get("origin"), deps.origins()) } });

  async function preflight(req: Request): Promise<{ uid: string } | Response> {
    if (!deps.enabled()) return respond(req, { error: "review_log_disabled" }, 503);
    if (!deps.configured()) return respond(req, { error: "sync_unavailable" }, 503);
    const uid = await deps.verifyUser(req);
    if (!uid) return respond(req, { error: "unauthorized" }, 401);
    return { uid };
  }

  async function fold(uid: string, branch: string): Promise<{ folded: boolean; advanced: number }> {
    const { baseline, rows } = await deps.readBranch(uid, branch);
    if (rows.length === 0) return { folded: false, advanced: 0 };
    let state: EngineState;
    try {
      state = replay(baseline, rows, deps.atoms());
    } catch (e) {
      console.error("review-log replay failed", branch, e);
      return { folded: false, advanced: 0 };
    }
    const seq = rows.reduce((m, r) => Math.max(m, r.seq), 0);
    const folded = await deps.writeFold(uid, branch, state, seq);
    if (!folded) return { folded: false, advanced: 0 };
    try {
      return { folded, advanced: (await deps.syncMastery(uid, branch, state)).advanced };
    } catch (e) {
      console.error("review-log mastery sync failed", branch, e);
      return { folded, advanced: 0 };
    }
  }

  function OPTIONS(req: Request): Response {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin"), deps.origins()) });
  }

  async function GET(req: Request): Promise<Response> {
    const pre = await preflight(req);
    if (pre instanceof Response) return pre;
    const url = new URL(req.url);
    const since = Number(url.searchParams.get("since") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? String(MAX_PULL));
    if (!Number.isSafeInteger(since) || since < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PULL) return respond(req, { error: "bad_request" }, 400);
    let reviews: StoredReview[];
    try {
      reviews = await deps.readLog(pre.uid, since, limit);
    } catch {
      return respond(req, { error: "read_failed" }, 500);
    }
    const cursor = reviews.reduce((m, r) => Math.max(m, r.seq), since);
    return respond(req, { reviews, cursor, more: reviews.length === limit }, 200);
  }

  async function POST(req: Request): Promise<Response> {
    const pre = await preflight(req);
    if (pre instanceof Response) return pre;
    const band = await deps.readAgeBand(pre.uid);
    if (!band.ok) return respond(req, { error: "consent_unavailable" }, 503);
    const gate = decideLearnWrite(band.band);
    if (!gate.allowed) return respond(req, { error: gate.reason, message: gate.message, needsProfile: gate.reason === "no_profile" }, 403);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respond(req, { error: "bad_request" }, 400);
    }
    const list = body && typeof body === "object" && Array.isArray((body as { reviews?: unknown }).reviews) ? (body as { reviews: unknown[] }).reviews : null;
    if (!list || list.length === 0 || list.length > MAX_BATCH) return respond(req, { error: "bad_request" }, 400);
    const parsed = list.map(parseReview);
    if (parsed.some((r) => r === null)) return respond(req, { error: "bad_request" }, 400);
    const now = deps.now();
    const rows = (parsed as ReviewInput[]).map((r) => toAppendRow(r, now));
    const keys = new Set(rows.map((r) => `${r.branch}/${r.review_id}`));
    if (keys.size !== rows.length) return respond(req, { error: "bad_request" }, 400);

    let results: AppendResult[];
    try {
      results = await deps.appendReviews(pre.uid, rows);
    } catch {
      return respond(req, { error: "write_failed" }, 500);
    }

    const inserted = new Set(results.filter((r) => r.status === "inserted").map((r) => r.review_id));
    const branches = Array.from(new Set(rows.filter((r) => inserted.has(r.review_id)).map((r) => r.branch)));
    let advanced = 0;
    const folded: string[] = [];
    for (const branch of branches) {
      try {
        const f = await fold(pre.uid, branch);
        advanced += f.advanced;
        if (f.folded) folded.push(branch);
      } catch (e) {
        console.error("review-log fold failed", branch, e);
      }
    }
    const conflict = results.some((r) => r.status === "conflict");
    return respond(req, { results, folded, advanced }, conflict ? 409 : 200);
  }

  return { OPTIONS, GET, POST };
}
