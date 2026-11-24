import type { Staff } from "./gate";

export const POST_STATUSES = ["ready", "draft_delivered", "posted", "skipped"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const OUTREACH_KINDS = ["creator", "teacher", "press", "club", "agency"] as const;
export const OUTREACH_STATUSES = ["drafted", "sent", "followup_due", "replied", "won", "lost"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export interface SocialPost {
  id: string;
  slug: string;
  platform: string;
  scheduled_for: string;
  status: PostStatus;
  caption: string;
  preview_url: string | null;
  views: number;
  likes: number;
  shares: number;
  approved_at: string | null;
  approved_by: string | null;
  updated_at: string;
}

export interface SocialMetric {
  post_id: string;
  captured_at: string;
  views: number;
}

export interface OutreachRow {
  id: string;
  contact: string;
  org: string | null;
  channel: string;
  kind: (typeof OUTREACH_KINDS)[number];
  status: OutreachStatus;
  last_touch: string | null;
  next_touch: string | null;
  thread_url: string | null;
}

export interface FunnelRow {
  day: string | null;
  source: string | null;
  visits: number;
  signup: number;
  trial: number;
  paid: number;
}

export const FUNNEL_STEPS = ["visits", "signup", "trial", "paid"] as const;
export type FunnelStepKey = (typeof FUNNEL_STEPS)[number];
export type FunnelCounts = Record<FunnelStepKey, number>;

const DAY_MS = 86_400_000;

export function dayOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function todayQueue(posts: SocialPost[], now: Date): SocialPost[] {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return posts
    .filter((p) => {
      const t = Date.parse(p.scheduled_for);
      return t >= start && t < start + DAY_MS;
    })
    .sort((a, b) => Date.parse(a.scheduled_for) - Date.parse(b.scheduled_for) || a.platform.localeCompare(b.platform));
}

export function outreachSummary(rows: OutreachRow[], now: Date) {
  const byStatus = Object.fromEntries(OUTREACH_STATUSES.map((s) => [s, 0])) as Record<OutreachStatus, number>;
  for (const r of rows) byStatus[r.status] += 1;
  const open = (r: OutreachRow) => r.status !== "won" && r.status !== "lost";
  const due = rows
    .filter((r) => open(r) && (r.status === "followup_due" || (r.next_touch !== null && Date.parse(r.next_touch) <= now.getTime())))
    .sort((a, b) => Date.parse(a.next_touch ?? a.last_touch ?? "1970-01-01") - Date.parse(b.next_touch ?? b.last_touch ?? "1970-01-01"));
  return { byStatus, due, total: rows.length };
}

export interface FunnelReport {
  byDay: ({ day: string } & FunnelCounts)[];
  bySource: ({ source: string } & FunnelCounts)[];
  totals: FunnelCounts;
}

function counts(r: FunnelRow): FunnelCounts {
  return { visits: Number(r.visits), signup: Number(r.signup), trial: Number(r.trial), paid: Number(r.paid) };
}

export function funnelReport(rows: FunnelRow[]): FunnelReport {
  const total = rows.find((r) => r.day === null && r.source === null);
  return {
    byDay: rows.filter((r) => r.day !== null && r.source === null).map((r) => ({ day: r.day!, ...counts(r) })).sort((a, b) => b.day.localeCompare(a.day)),
    bySource: rows.filter((r) => r.source !== null && r.day === null).map((r) => ({ source: r.source!, ...counts(r) })).sort((a, b) => b.visits - a.visits),
    totals: total ? counts(total) : { visits: 0, signup: 0, trial: 0, paid: 0 },
  };
}

export interface ViewSeries {
  postId: string;
  slug: string;
  platform: string;
  points: { day: string; views: number }[];
  latest: number;
}

export function viewSeries(posts: SocialPost[], metrics: SocialMetric[]): ViewSeries[] {
  const byPost = new Map<string, Map<string, number>>();
  for (const m of metrics) {
    const days = byPost.get(m.post_id) ?? new Map<string, number>();
    const day = dayOf(m.captured_at);
    days.set(day, Math.max(days.get(day) ?? 0, m.views));
    byPost.set(m.post_id, days);
  }
  return posts
    .filter((p) => p.status === "posted" || byPost.has(p.id))
    .map((p) => {
      const points = Array.from((byPost.get(p.id) ?? new Map<string, number>()).entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, views]) => ({ day, views }));
      return { postId: p.id, slug: p.slug, platform: p.platform, points, latest: Math.max(p.views, points.at(-1)?.views ?? 0) };
    })
    .sort((a, b) => b.latest - a.latest);
}

export const POST_DECISIONS = ["approve", "skip"] as const;
export type PostDecision = (typeof POST_DECISIONS)[number];

export interface PostDecisionDeps {
  find: (id: string) => Promise<SocialPost | null>;
  update: (id: string, patch: Partial<Pick<SocialPost, "status" | "approved_at" | "approved_by">>) => Promise<boolean>;
}

export type PostDecisionResult = { ok: true } | { ok: false; error: "forbidden" | "bad_decision" | "not_found" | "already_posted" | "already_skipped" | "conflict" | "update_failed" };

export async function decidePost(deps: PostDecisionDeps, staff: Staff | null, postId: string, decision: string, now: Date = new Date()): Promise<PostDecisionResult> {
  if (!staff) return { ok: false, error: "forbidden" };
  if (!(POST_DECISIONS as readonly string[]).includes(decision)) return { ok: false, error: "bad_decision" };
  const post = await deps.find(postId);
  if (!post) return { ok: false, error: "not_found" };
  if (post.status === "posted") return { ok: false, error: "already_posted" };
  if (decision === "approve" && post.status === "skipped") return { ok: false, error: "already_skipped" };
  const patch = decision === "approve" ? { approved_at: now.toISOString(), approved_by: staff.email } : { status: "skipped" as const, approved_at: null, approved_by: null };
  try {
    if (!(await deps.update(postId, patch))) return { ok: false, error: "conflict" };
  } catch (err) {
    console.error("[admin] polingual post decision failed", postId, decision, err instanceof Error ? err.message : err);
    return { ok: false, error: "update_failed" };
  }
  return { ok: true };
}
