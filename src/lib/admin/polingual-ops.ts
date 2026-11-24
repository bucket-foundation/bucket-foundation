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

export interface FunnelEvent {
  visitor: string;
  name: string;
  utm_source: string | null;
  at: string;
}

export const FUNNEL_STEPS = ["visits", "signup", "trial", "paid"] as const;
export type FunnelStepKey = (typeof FUNNEL_STEPS)[number];
export type FunnelCounts = Record<FunnelStepKey, number>;

const STEP_OF: Record<string, FunnelStepKey> = {
  page_view: "visits",
  landing_view: "visits",
  signup: "signup",
  trial_start: "trial",
  paid: "paid",
};

const DAY_MS = 86_400_000;

function empty(): FunnelCounts {
  return { visits: 0, signup: 0, trial: 0, paid: 0 };
}

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

export function funnelReport(events: FunnelEvent[]): FunnelReport {
  const sorted = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const sourceOf = new Map<string, string>();
  const seen = new Set<string>();
  const byDay = new Map<string, FunnelCounts>();
  const bySource = new Map<string, FunnelCounts>();
  const totals = empty();
  for (const e of sorted) {
    if (!sourceOf.has(e.visitor)) sourceOf.set(e.visitor, e.utm_source?.trim() || "direct");
    const step = STEP_OF[e.name];
    if (!step) continue;
    const day = dayOf(e.at);
    const dayKey = `${step}|${e.visitor}|${day}`;
    const allKey = `${step}|${e.visitor}`;
    if (!seen.has(dayKey)) {
      seen.add(dayKey);
      const d = byDay.get(day) ?? empty();
      d[step] += 1;
      byDay.set(day, d);
    }
    if (!seen.has(allKey)) {
      seen.add(allKey);
      const source = sourceOf.get(e.visitor)!;
      const s = bySource.get(source) ?? empty();
      s[step] += 1;
      bySource.set(source, s);
      totals[step] += 1;
    }
  }
  return {
    byDay: Array.from(byDay.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([day, c]) => ({ day, ...c })),
    bySource: Array.from(bySource.entries()).sort(([, a], [, b]) => b.visits - a.visits).map(([source, c]) => ({ source, ...c })),
    totals,
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
  update: (id: string, patch: Partial<Pick<SocialPost, "status" | "approved_at" | "approved_by" | "updated_at">>) => Promise<void>;
}

export type PostDecisionResult = { ok: true } | { ok: false; error: "bad_decision" | "not_found" | "already_posted" | "update_failed" };

export async function decidePost(deps: PostDecisionDeps, staff: Staff, postId: string, decision: string, now: Date = new Date()): Promise<PostDecisionResult> {
  if (!(POST_DECISIONS as readonly string[]).includes(decision)) return { ok: false, error: "bad_decision" };
  const post = await deps.find(postId);
  if (!post) return { ok: false, error: "not_found" };
  if (post.status === "posted") return { ok: false, error: "already_posted" };
  const stamp = now.toISOString();
  const patch =
    decision === "approve"
      ? { status: "ready" as const, approved_at: stamp, approved_by: staff.email, updated_at: stamp }
      : { status: "skipped" as const, approved_at: null, approved_by: null, updated_at: stamp };
  try {
    await deps.update(postId, patch);
  } catch (err) {
    console.error("[admin] polingual post decision failed", postId, decision, err instanceof Error ? err.message : err);
    return { ok: false, error: "update_failed" };
  }
  return { ok: true };
}
