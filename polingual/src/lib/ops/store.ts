import type { Fetcher, OpsEnv } from "./gate";
import type { FunnelRow, OutreachRow, PostPatch, PostWriter, SocialMetric, SocialPost } from "./ops";

export interface OpsSource {
  posts: (sinceIso: string) => Promise<SocialPost[]>;
  metrics: (sinceIso: string) => Promise<SocialMetric[]>;
  outreach: () => Promise<OutreachRow[]>;
  funnel: (sinceIso: string) => Promise<FunnelRow[]>;
  writer: PostWriter;
}

export const POST_COLUMNS = "id,slug,platform,scheduled_for,status,caption,hashtags,slides,sent,preview_url,views,likes,shares,approved_at,approved_by,updated_at";
const TIMEOUT_MS = 8000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function missingStoreEnv(env: OpsEnv): string[] {
  return ["POLINGUAL_DB_URL", "POLINGUAL_DB_SERVICE_KEY"].filter((k) => !env[k]?.trim());
}

export function guardQuery(patch: PostPatch): string {
  const blocked = [...(patch.sent ? [] : ["posted"]), ...(patch.status === "skipped" ? [] : ["skipped"])];
  return blocked.length ? `&status=not.in.(${blocked.join(",")})` : "";
}

export function postgrestOps(env: OpsEnv, send: Fetcher): OpsSource | null {
  if (missingStoreEnv(env).length) return null;
  const base = env.POLINGUAL_DB_URL!.trim().replace(/\/$/, "");
  const key = env.POLINGUAL_DB_SERVICE_KEY!.trim();
  const headers = (schema: string, extra: Record<string, string> = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": schema, "Content-Profile": schema, "Content-Type": "application/json", ...extra });
  async function req<T>(label: string, path: string, init: RequestInit & { schema?: string; prefer?: string } = {}): Promise<T> {
    const r = await send(`${base}/rest/v1/${path}`, {
      method: init.method ?? "GET",
      headers: headers(init.schema ?? "bucket", init.prefer ? { Prefer: init.prefer } : {}),
      body: init.body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${label}: ${r.status} ${text.slice(0, 200)}`);
    return (text ? JSON.parse(text) : []) as T;
  }
  const q = encodeURIComponent;
  return {
    posts: (since) => req<SocialPost[]>("polingual_social_posts list", `polingual_social_posts?select=${POST_COLUMNS}&scheduled_for=gte.${q(since)}&order=scheduled_for.asc&limit=2000`),
    metrics: (since) => req<SocialMetric[]>("polingual_social_metrics list", `polingual_social_metrics?select=post_id,captured_at,views&captured_at=gte.${q(since)}&order=captured_at.asc&limit=20000`),
    outreach: () => req<OutreachRow[]>("polingual_outreach list", "polingual_outreach?select=id,contact,org,channel,kind,status,last_touch,next_touch,thread_url&order=next_touch.asc.nullslast&limit=1000"),
    funnel: (since) => req<FunnelRow[]>("polingual_funnel_daily", "rpc/polingual_funnel_daily", { method: "POST", schema: "public", body: JSON.stringify({ p_since: since }) }),
    writer: {
      find: async (id) => {
        if (!UUID.test(id)) return null;
        const rows = await req<SocialPost[]>("polingual_social_posts read", `polingual_social_posts?select=${POST_COLUMNS}&id=eq.${q(id)}&limit=1`);
        return rows[0] ?? null;
      },
      update: async (id, patch) => {
        if (!UUID.test(id)) return false;
        const rows = await req<{ id: string }[]>("polingual_social_posts update", `polingual_social_posts?id=eq.${q(id)}${guardQuery(patch)}&select=id`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=representation" });
        return rows.length > 0;
      },
    },
  };
}
