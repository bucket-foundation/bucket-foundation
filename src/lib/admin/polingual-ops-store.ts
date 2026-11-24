import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configured } from "@/lib/research-os/db";
import { fixturesEnabled } from "./gate";
import type { FunnelEvent, OutreachRow, PostDecisionDeps, SocialMetric, SocialPost } from "./polingual-ops";

export interface PolingualOpsSource {
  posts: (sinceIso: string) => Promise<SocialPost[]>;
  metrics: (sinceIso: string) => Promise<SocialMetric[]>;
  outreach: () => Promise<OutreachRow[]>;
  funnelEvents: (sinceIso: string) => Promise<FunnelEvent[]>;
  decisions: PostDecisionDeps;
}

const POST_COLUMNS = "id, slug, platform, scheduled_for, status, caption, preview_url, views, likes, shares, approved_at, approved_by, updated_at";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let _bucket: SupabaseClient | null = null;
let _public: SupabaseClient | null = null;
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
const bucket = () => (_bucket ??= createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, { ...opts, db: { schema: "bucket" } }) as unknown as SupabaseClient);
const pub = () => (_public ??= createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, opts));

function must<T>(label: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return (r.data ?? []) as T;
}

function supabaseOps(): PolingualOpsSource | null {
  if (!configured()) return null;
  return {
    posts: async (since) => must<SocialPost[]>("polingual_social_posts list", await bucket().from("polingual_social_posts").select(POST_COLUMNS).gte("scheduled_for", since).order("scheduled_for").limit(2000)),
    metrics: async (since) => must<SocialMetric[]>("polingual_social_metrics list", await bucket().from("polingual_social_metrics").select("post_id, captured_at, views").gte("captured_at", since).order("captured_at").limit(20_000)),
    outreach: async () => must<OutreachRow[]>("polingual_outreach list", await bucket().from("polingual_outreach").select("id, contact, org, channel, kind, status, last_touch, next_touch, thread_url").order("next_touch", { ascending: true, nullsFirst: false }).limit(1000)),
    funnelEvents: async (since) =>
      must<FunnelEvent[]>(
        "polingual_web_events list",
        await pub().from("polingual_web_events").select("visitor, name, utm_source, at").gte("at", since).in("name", ["page_view", "landing_view", "signup", "trial_start", "paid"]).order("at").limit(50_000),
      ),
    decisions: {
      find: async (id) => {
        const r = await bucket().from("polingual_social_posts").select(POST_COLUMNS).eq("id", id).maybeSingle();
        if (r.error) throw new Error(`polingual_social_posts read: ${r.error.message}`);
        return (r.data as SocialPost | null) ?? null;
      },
      update: async (id, patch) => {
        const r = await bucket().from("polingual_social_posts").update(patch).eq("id", id);
        if (r.error) throw new Error(`polingual_social_posts update: ${r.error.message}`);
      },
    },
  };
}

export function fixtureOps(now: Date = new Date()): PolingualOpsSource {
  const day = (offset: number, hour = 15) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, hour)).toISOString();
  const posts: SocialPost[] = [
    { id: "p1", slug: "false-friends-es", platform: "tiktok", scheduled_for: day(0), status: "ready", caption: "Five Spanish false friends", preview_url: null, views: 0, likes: 0, shares: 0, approved_at: null, approved_by: null, updated_at: day(0, 8) },
    { id: "p2", slug: "false-friends-es", platform: "instagram", scheduled_for: day(0, 17), status: "draft_delivered", caption: "Five Spanish false friends", preview_url: null, views: 0, likes: 0, shares: 0, approved_at: null, approved_by: null, updated_at: day(0, 8) },
    { id: "p3", slug: "kanji-roots", platform: "tiktok", scheduled_for: day(-2), status: "posted", caption: "Kanji roots", preview_url: null, views: 4210, likes: 310, shares: 22, approved_at: day(-2, 9), approved_by: "staff@fixtures.local", updated_at: day(-1) },
  ];
  const metrics: SocialMetric[] = [
    { post_id: "p3", captured_at: day(-2, 20), views: 900 },
    { post_id: "p3", captured_at: day(-1, 20), views: 3100 },
    { post_id: "p3", captured_at: day(0, 6), views: 4210 },
  ];
  const outreach: OutreachRow[] = [
    { id: "o1", contact: "Lena", org: "Berlin Language Club", channel: "email", kind: "club", status: "followup_due", last_touch: day(-6), next_touch: day(-1), thread_url: null },
    { id: "o2", contact: "Mateo", org: null, channel: "tiktok dm", kind: "creator", status: "sent", last_touch: day(-1), next_touch: day(3), thread_url: null },
  ];
  const funnelEvents: FunnelEvent[] = [];
  for (let i = 0; i < 40; i++) {
    const visitor = `00000000-0000-4000-9000-${String(i).padStart(12, "0")}`;
    const source = ["tiktok", "instagram", null][i % 3];
    const at = day(-(i % 7), 10);
    funnelEvents.push({ visitor, name: "landing_view", utm_source: source, at });
    if (i % 3 === 0) funnelEvents.push({ visitor, name: "signup", utm_source: source, at });
    if (i % 6 === 0) funnelEvents.push({ visitor, name: "trial_start", utm_source: source, at });
    if (i % 12 === 0) funnelEvents.push({ visitor, name: "paid", utm_source: source, at });
  }
  return {
    posts: async () => posts,
    metrics: async () => metrics,
    outreach: async () => outreach,
    funnelEvents: async () => funnelEvents,
    decisions: {
      find: async (id) => posts.find((p) => p.id === id) ?? null,
      update: async (id, patch) => {
        const p = posts.find((x) => x.id === id);
        if (p) Object.assign(p, patch);
      },
    },
  };
}

let _fixture: PolingualOpsSource | null = null;

export function polingualOpsSource(): PolingualOpsSource | null {
  return fixturesEnabled() ? (_fixture ??= fixtureOps()) : supabaseOps();
}
