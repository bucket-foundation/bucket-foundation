export const STREAK_GOAL_DAYS = 100;
export const ADMIN_APPS = ["bucket", "polingual"] as const;
export type AdminApp = (typeof ADMIN_APPS)[number] | "web" | "unknown";

export const BUNDLE_APPS: Record<string, AdminApp> = {
  "foundation.bucket.app": "bucket",
  "com.polingual.app": "polingual",
};

export interface OverviewRow {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  first_app: string | null;
  cohort: string | null;
  streak_days: number | null;
  last_active_day: string | null;
  languages: string[] | null;
  last_event_at: string | null;
  plan_product: string | null;
  plan_kind: string | null;
  plan_bundle: string | null;
  plan_expires_at: string | null;
  placement: Record<string, unknown> | null;
}

export interface UserProfile {
  id: string;
  email: string | null;
  app: AdminApp;
  plan: string;
  languages: string[];
  streak: { day: number; goal: number; label: string };
  level: string;
  lastActive: string | null;
  joined: string;
  cohort: string | null;
  disabled: boolean;
}

export function appFor(row: Pick<OverviewRow, "first_app" | "plan_bundle">): AdminApp {
  if (row.plan_bundle && BUNDLE_APPS[row.plan_bundle]) return BUNDLE_APPS[row.plan_bundle];
  if (row.first_app === "bucket" || row.first_app === "polingual" || row.first_app === "web") return row.first_app;
  return "unknown";
}

const ACTIVE_PLAN_KINDS = new Set(["trial", "subscribe", "renew", "uncancel", "billing_issue"]);

export function planFor(row: Pick<OverviewRow, "plan_product" | "plan_kind" | "plan_expires_at">, now: Date): string {
  if (!row.plan_product || !row.plan_kind) return "free";
  const live = ACTIVE_PLAN_KINDS.has(row.plan_kind) && (!row.plan_expires_at || Date.parse(row.plan_expires_at) > now.getTime());
  if (!live) return `free, ${row.plan_product} ${row.plan_kind}`;
  return row.plan_kind === "trial" ? `${row.plan_product} trial` : row.plan_product;
}

export function streakFor(days: number | null): UserProfile["streak"] {
  const day = Math.max(0, Math.floor(days ?? 0));
  return { day, goal: STREAK_GOAL_DAYS, label: `day ${day} of ${STREAK_GOAL_DAYS}` };
}

export function levelFor(placement: Record<string, unknown> | null): string {
  if (!placement) return "not placed";
  const cefr = placement.cefr;
  if (typeof cefr === "string" && /^(A1|A2|B1|B2|C1|C2)$/.test(cefr)) return cefr;
  const branch = typeof placement.branch === "string" ? placement.branch : "unknown";
  const known = Number(placement.known);
  const questions = Number(placement.questions);
  if (Number.isFinite(known) && Number.isFinite(questions) && questions > 0) return `${branch}: ${known}/${questions} known`;
  return `${branch}: placed`;
}

function latest(...isos: (string | null)[]): string | null {
  const times = isos.filter((v): v is string => Boolean(v)).map((v) => Date.parse(v)).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

export function toProfile(row: OverviewRow, now: Date = new Date()): UserProfile {
  return {
    id: row.user_id,
    email: row.email,
    app: appFor(row),
    plan: planFor(row, now),
    languages: row.languages ?? [],
    streak: streakFor(row.streak_days),
    level: levelFor(row.placement),
    lastActive: latest(row.last_event_at, row.last_active_day ? `${row.last_active_day}T00:00:00.000Z` : null, row.last_sign_in_at),
    joined: row.created_at,
    cohort: row.cohort,
    disabled: Boolean(row.banned_until && Date.parse(row.banned_until) > now.getTime()),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserQuery = { kind: "all" } | { kind: "id"; id: string } | { kind: "email"; text: string };

export function parseUserQuery(raw: string | null | undefined): UserQuery {
  const q = (raw ?? "").trim().slice(0, 120);
  if (!q) return { kind: "all" };
  if (UUID_RE.test(q)) return { kind: "id", id: q.toLowerCase() };
  return { kind: "email", text: q.replace(/[%_,()\\]/g, "").toLowerCase() };
}

export function matchesQuery(row: Pick<OverviewRow, "user_id" | "email">, q: UserQuery): boolean {
  if (q.kind === "all") return true;
  if (q.kind === "id") return row.user_id.toLowerCase() === q.id;
  return (row.email ?? "").toLowerCase().includes(q.text);
}
