import type { Fetcher, OpsEnv } from "./gate";
import { fullCaption, PLATFORMS, type Platform, type PostWriter, type SocialPost } from "./ops";

export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/content/init/";
export const GRAPH_BASE = "https://graph.facebook.com/v21.0";
export const SOCIAL_BUCKET_DEFAULT = "polingual-social";
const TIMEOUT_MS = 20_000;
const IG_MAX_SLIDES = 10;
const TIKTOK_MAX_SLIDES = 35;

export const PLATFORM_ENV: Record<Platform, string[]> = {
  tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN", "TIKTOK_PUBLIC_BASE"],
  instagram: ["INSTAGRAM_USER_ID", "INSTAGRAM_ACCESS_TOKEN", "POLINGUAL_DB_URL"],
};

export function missingEnv(platform: Platform, env: OpsEnv): string[] {
  return PLATFORM_ENV[platform].filter((k) => !env[k]?.trim());
}

export function isPlatform(v: string): v is Platform {
  return (PLATFORMS as readonly string[]).includes(v);
}

export function socialBucket(env: OpsEnv): string {
  return env.POLINGUAL_SOCIAL_BUCKET?.trim() || SOCIAL_BUCKET_DEFAULT;
}

export function storageUrl(path: string, env: OpsEnv): string {
  return `${env.POLINGUAL_DB_URL!.trim().replace(/\/$/, "")}/storage/v1/object/public/${socialBucket(env)}/${path}`;
}

export function tiktokUrl(path: string, env: OpsEnv): string {
  return `${env.TIKTOK_PUBLIC_BASE!.trim().replace(/\/$/, "")}/${path}`;
}

export type SendError = "forbidden" | "bad_platform" | "not_found" | "not_approved" | "already_sent" | "skipped" | "no_slides" | "too_many_slides" | "missing_env" | "platform_error" | "human_check" | "update_failed";
export type SendResult = { ok: true; id: string | null; mode: string } | { ok: false; error: SendError; missing?: string[]; detail?: string };

async function call(send: Fetcher, url: string, init: RequestInit): Promise<{ status: number; ok: boolean; json: Record<string, unknown>; text: string }> {
  const r = await send(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await r.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: r.status, ok: r.ok, json, text };
}

function errText(json: Record<string, unknown>, text: string): string {
  const e = json.error;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    return String(o.message ?? o.code ?? "").slice(0, 300);
  }
  return (typeof json.error_description === "string" ? json.error_description : text).slice(0, 300);
}

const HUMAN_GATE = /captcha|human verification|verify you are human/i;

export async function tiktokAccessToken(env: OpsEnv, send: Fetcher): Promise<{ ok: true; token: string } | { ok: false; detail: string }> {
  const form = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY!.trim(),
    client_secret: env.TIKTOK_CLIENT_SECRET!.trim(),
    grant_type: "refresh_token",
    refresh_token: env.TIKTOK_REFRESH_TOKEN!.trim(),
  });
  const r = await call(send, TIKTOK_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  if (!r.ok || typeof r.json.access_token !== "string") return { ok: false, detail: `token refresh ${r.status}: ${errText(r.json, r.text)}` };
  return { ok: true, token: r.json.access_token };
}

export async function sendTikTok(post: SocialPost, env: OpsEnv, send: Fetcher): Promise<SendResult> {
  const missing = missingEnv("tiktok", env);
  if (missing.length) return { ok: false, error: "missing_env", missing };
  if (post.slides.length > TIKTOK_MAX_SLIDES) return { ok: false, error: "too_many_slides" };
  const tok = await tiktokAccessToken(env, send);
  if (!tok.ok) return { ok: false, error: "platform_error", detail: tok.detail };
  const caption = fullCaption(post);
  const payload = {
    media_type: "PHOTO",
    post_mode: "MEDIA_UPLOAD",
    post_info: { title: caption.split("\n")[0].slice(0, 90), description: caption.slice(0, 4000), privacy_level: "SELF_ONLY", disable_comment: false, auto_add_music: true },
    source_info: { source: "PULL_FROM_URL", photo_images: post.slides.map((s) => tiktokUrl(s, env)), photo_cover_index: 0 },
  };
  const r = await call(send, TIKTOK_INIT_URL, { method: "POST", headers: { Authorization: `Bearer ${tok.token}`, "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(payload) });
  if (HUMAN_GATE.test(r.text)) return { ok: false, error: "human_check", detail: "TikTok asked for a human check. Open the TikTok app and finish it there." };
  const code = (r.json.error as { code?: unknown } | undefined)?.code;
  if (!r.ok || (code && code !== "ok")) return { ok: false, error: "platform_error", detail: `tiktok ${r.status}: ${errText(r.json, r.text)}` };
  const id = (r.json.data as { publish_id?: unknown } | undefined)?.publish_id;
  return { ok: true, id: typeof id === "string" ? id : null, mode: "MEDIA_UPLOAD" };
}

export async function sendInstagram(post: SocialPost, env: OpsEnv, send: Fetcher): Promise<SendResult> {
  const missing = missingEnv("instagram", env);
  if (missing.length) return { ok: false, error: "missing_env", missing };
  if (post.slides.length > IG_MAX_SLIDES) return { ok: false, error: "too_many_slides" };
  const user = env.INSTAGRAM_USER_ID!.trim();
  const token = env.INSTAGRAM_ACCESS_TOKEN!.trim();
  const graph = (path: string, params: Record<string, string>) => call(send, `${GRAPH_BASE}/${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...params, access_token: token }) });
  const fail = (step: string, r: { status: number; json: Record<string, unknown>; text: string }): SendResult => ({ ok: false, error: "platform_error", detail: `instagram ${step} ${r.status}: ${errText(r.json, r.text)}` });
  const single = post.slides.length === 1;
  const children: string[] = [];
  for (const slide of post.slides) {
    const r = await graph(`${user}/media`, single ? { image_url: storageUrl(slide, env), caption: fullCaption(post) } : { image_url: storageUrl(slide, env), is_carousel_item: "true" });
    if (!r.ok || typeof r.json.id !== "string") return fail("item", r);
    children.push(r.json.id);
  }
  let container = children[0];
  if (!single) {
    const r = await graph(`${user}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: fullCaption(post) });
    if (!r.ok || typeof r.json.id !== "string") return fail("carousel", r);
    container = r.json.id;
  }
  const pub = await graph(`${user}/media_publish`, { creation_id: container });
  if (!pub.ok || typeof pub.json.id !== "string") return fail("publish", pub);
  return { ok: true, id: pub.json.id, mode: "PUBLISH" };
}

export async function sendPost(deps: PostWriter, admin: string | null, postId: string, platform: string, env: OpsEnv, send: Fetcher, now: Date = new Date()): Promise<SendResult> {
  if (!admin) return { ok: false, error: "forbidden" };
  if (!isPlatform(platform)) return { ok: false, error: "bad_platform" };
  const missing = missingEnv(platform, env);
  if (missing.length) return { ok: false, error: "missing_env", missing };
  const post = await deps.find(postId);
  if (!post) return { ok: false, error: "not_found" };
  if (post.sent[platform]) return { ok: false, error: "already_sent" };
  if (post.status === "skipped") return { ok: false, error: "skipped" };
  if (!post.approved_at) return { ok: false, error: "not_approved" };
  if (post.slides.length === 0) return { ok: false, error: "no_slides" };
  const r = platform === "tiktok" ? await sendTikTok(post, env, send) : await sendInstagram(post, env, send);
  if (!r.ok) {
    console.error("[ops] polingual send failed", postId, platform, r.error, r.detail ?? "");
    return r;
  }
  const sent = { ...post.sent, [platform]: { id: r.id, at: now.toISOString(), mode: r.mode } };
  const status = platform === "instagram" ? "posted" : post.status === "ready" ? "draft_delivered" : post.status;
  try {
    if (!(await deps.update(postId, { sent, status }))) return { ok: false, error: "update_failed", detail: `${platform} accepted ${r.id ?? "the post"} but the row did not update` };
  } catch (err) {
    return { ok: false, error: "update_failed", detail: `${platform} accepted ${r.id ?? "the post"}; row update failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  return r;
}
