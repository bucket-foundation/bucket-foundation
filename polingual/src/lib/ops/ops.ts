export const POST_STATUSES = ["ready", "draft_delivered", "posted", "skipped"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const PLATFORMS = ["tiktok", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const OUTREACH_KINDS = ["creator", "teacher", "press", "club", "agency"] as const;
export const OUTREACH_STATUSES = ["drafted", "sent", "followup_due", "replied", "won", "lost"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export type SendRecord = { id: string | null; at: string; mode: string; state: "sending" | "sent" | "unrecorded" };

export interface SocialPost {
  id: string;
  slug: string;
  platform: string;
  scheduled_for: string;
  status: PostStatus;
  caption: string;
  hashtags: string;
  slides: string[];
  sent: Partial<Record<Platform, SendRecord>>;
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

export function reviewQueue(posts: SocialPost[]): SocialPost[] {
  return posts.filter((p) => p.status !== "skipped" && PLATFORMS.some((k) => !p.sent[k])).sort((a, b) => Date.parse(a.scheduled_for) - Date.parse(b.scheduled_for) || a.slug.localeCompare(b.slug));
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

export type PostPatch = Partial<Pick<SocialPost, "status" | "approved_at" | "approved_by" | "caption" | "sent">>;

export interface PostWriter {
  find: (id: string) => Promise<SocialPost | null>;
  update: (id: string, patch: PostPatch) => Promise<boolean>;
  claim: (post: SocialPost, platform: Platform, record: SendRecord) => Promise<boolean>;
  release: (id: string, platform: Platform) => Promise<void>;
}

export const POST_DECISIONS = ["approve", "skip"] as const;
export type PostDecision = (typeof POST_DECISIONS)[number];
export type PostError = "forbidden" | "bad_decision" | "not_found" | "already_posted" | "already_skipped" | "conflict" | "update_failed" | "bad_caption";
export type PostResult = { ok: true } | { ok: false; error: PostError };

export const CAPTION_MAX = 2200;

async function write(deps: PostWriter, id: string, patch: PostPatch, label: string): Promise<PostResult> {
  try {
    if (!(await deps.update(id, patch))) return { ok: false, error: "conflict" };
  } catch (err) {
    console.error("[ops] polingual post", label, "failed", id, err instanceof Error ? err.message : err);
    return { ok: false, error: "update_failed" };
  }
  return { ok: true };
}

export async function decidePost(deps: PostWriter, admin: string | null, postId: string, decision: string, caption: string | null = null, now: Date = new Date()): Promise<PostResult> {
  if (!admin) return { ok: false, error: "forbidden" };
  if (!(POST_DECISIONS as readonly string[]).includes(decision)) return { ok: false, error: "bad_decision" };
  if (caption !== null && caption.length > CAPTION_MAX) return { ok: false, error: "bad_caption" };
  const post = await deps.find(postId);
  if (!post) return { ok: false, error: "not_found" };
  if (post.status === "posted") return { ok: false, error: "already_posted" };
  if (decision === "approve" && post.status === "skipped") return { ok: false, error: "already_skipped" };
  const patch: PostPatch =
    decision === "approve"
      ? { approved_at: now.toISOString(), approved_by: admin, ...(caption !== null ? { caption: caption.trim() } : {}) }
      : { status: "skipped", approved_at: null, approved_by: null };
  return write(deps, postId, patch, decision);
}

export async function editCaption(deps: PostWriter, admin: string | null, postId: string, caption: string): Promise<PostResult> {
  if (!admin) return { ok: false, error: "forbidden" };
  if (caption.length > CAPTION_MAX) return { ok: false, error: "bad_caption" };
  const post = await deps.find(postId);
  if (!post) return { ok: false, error: "not_found" };
  if (post.status === "posted") return { ok: false, error: "already_posted" };
  return write(deps, postId, { caption: caption.trim() }, "caption");
}

export function fullCaption(post: Pick<SocialPost, "caption" | "hashtags">): string {
  const tags = post.hashtags.trim();
  if (!tags || post.caption.includes(tags)) return post.caption.trim();
  return `${post.caption.trim()}\n\n${tags}`;
}
