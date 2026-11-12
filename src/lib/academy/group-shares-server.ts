import { DEFAULT_FROM, DEFAULT_NOTIFY_TO } from "@/lib/download/notify";
import { complete, localLlmConfig } from "@/lib/llm/client";
import { AUDIO_URL_SECONDS, TRANSLATE_MODEL, TRANSLATE_PER_MINUTE, VOICE_BUCKET, VOICE_CONTENT_TYPE, bucketFor, type Translator } from "./group-voice";
import { SHARE_BUCKET, SHARE_ITEM_COLS, SHARE_PER_MINUTE, type SharedItemRow } from "./group-shares";
import { windowLimiter } from "./groups";
import { service } from "./groups-server";

export const ITEMS = "group_shared_items";
export const ITEM_REPORTS = "group_item_reports";
const ITEM_LIMIT = 50;
const SIGNED_URL_SECONDS = 3600;

export const shareLimited = windowLimiter(SHARE_PER_MINUTE, 60_000);

export async function itemsOf(groupId: string): Promise<SharedItemRow[]> {
  const res = await service().from(ITEMS).select(SHARE_ITEM_COLS).eq("group_id", groupId).is("removed_at", null).order("created_at", { ascending: false }).limit(ITEM_LIMIT);
  if (res.error) throw new Error(`items read: ${res.error.message}`);
  return (res.data ?? []) as SharedItemRow[];
}

export async function itemById(id: string): Promise<SharedItemRow | null> {
  const res = await service().from(ITEMS).select(SHARE_ITEM_COLS).eq("id", id).maybeSingle();
  if (res.error) throw new Error(`item read: ${res.error.message}`);
  return res.data as SharedItemRow | null;
}

export async function reportedBy(uid: string, itemIds: string[]): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();
  const res = await service().from(ITEM_REPORTS).select("item_id").eq("reporter_id", uid).in("item_id", itemIds);
  if (res.error) throw new Error(`item reports read: ${res.error.message}`);
  return new Set((res.data ?? []).map((r: { item_id: string }) => r.item_id));
}

export function signedImageUrls(paths: string[]): Promise<Map<string, string>> {
  return signedUrls(SHARE_BUCKET, paths, SIGNED_URL_SECONDS);
}

export function signedAudioUrls(paths: string[]): Promise<Map<string, string>> {
  return signedUrls(VOICE_BUCKET, paths, AUDIO_URL_SECONDS);
}

async function signedUrls(bucket: string, paths: string[], seconds: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const res = await service().storage.from(bucket).createSignedUrls(paths, seconds);
  if (res.error) throw new Error(`signed urls: ${res.error.message}`);
  for (const s of res.data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

export async function uploadImage(path: string, bytes: Uint8Array): Promise<void> {
  const res = await service().storage.from(SHARE_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (res.error) throw new Error(`image upload: ${res.error.message}`);
}

export async function uploadAudio(path: string, bytes: Uint8Array): Promise<void> {
  const res = await service().storage.from(VOICE_BUCKET).upload(path, bytes, { contentType: VOICE_CONTENT_TYPE, upsert: false });
  if (res.error) throw new Error(`audio upload: ${res.error.message}`);
}

export const translateLimited = windowLimiter(TRANSLATE_PER_MINUTE, 60_000);

export const llmTranslator: Translator = async (req) => {
  const res = await complete({ ...req, maxTokens: 800, anthropicModel: TRANSLATE_MODEL, local: localLlmConfig(20), noProviderStatus: 503 });
  return res.text;
};

export async function cacheTranslation(itemId: string, lang: string, text: string): Promise<void> {
  const res = await service().rpc("cache_voice_translation", { p_item: itemId, p_lang: lang, p_text: text });
  if (res.error) throw new Error(`cache_voice_translation: ${res.error.message}`);
}

export async function deleteImage(path: string): Promise<void> {
  await service().storage.from(SHARE_BUCKET).remove([path]);
}

export async function deleteAudio(path: string): Promise<void> {
  await service().storage.from(VOICE_BUCKET).remove([path]);
}

export const PURGE = "group_share_purge";

export async function drainPurge(limit = 100): Promise<number> {
  const res = await service().from(PURGE).select("path").order("queued_at").limit(limit);
  if (res.error) throw new Error(`purge read: ${res.error.message}`);
  const paths = (res.data ?? []).map((r: { path: string }) => r.path);
  if (paths.length === 0) return 0;
  for (const bucket of [SHARE_BUCKET, VOICE_BUCKET]) {
    const mine = paths.filter((p) => bucketFor(p) === bucket);
    if (mine.length === 0) continue;
    const removed = await service().storage.from(bucket).remove(mine);
    if (removed.error) throw new Error(`purge remove: ${removed.error.message}`);
  }
  const done = await service().from(PURGE).delete().in("path", paths);
  if (done.error) throw new Error(`purge clear: ${done.error.message}`);
  return paths.length;
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.bucket.foundation").replace(/\/$/, "");
}

export async function emailItemReport(text: string, reason: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error("[academy/groups] RESEND_API_KEY unset; item report not emailed");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: process.env.MODERATION_EMAIL?.trim() || DEFAULT_NOTIFY_TO,
      subject: `Shared item report: ${reason}`,
      text,
    }),
  });
  if (!res.ok) throw new Error(`item report email ${res.status}`);
  return true;
}
