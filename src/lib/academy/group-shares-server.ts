import { DEFAULT_FROM, DEFAULT_NOTIFY_TO } from "@/lib/download/notify";
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

export async function signedImageUrls(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const res = await service().storage.from(SHARE_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (res.error) throw new Error(`signed urls: ${res.error.message}`);
  for (const s of res.data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

export async function uploadImage(path: string, bytes: Uint8Array): Promise<void> {
  const res = await service().storage.from(SHARE_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (res.error) throw new Error(`image upload: ${res.error.message}`);
}

export async function deleteImage(path: string): Promise<void> {
  await service().storage.from(SHARE_BUCKET).remove([path]);
}

export async function emailItemReport(report: { itemId: string; groupId: string; groupName: string; senderId: string; senderName: string; reason: string; reports: number; preview: string }): Promise<boolean> {
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
      subject: `Shared item report: ${report.reason}`,
      text: `Item: ${report.itemId}\nGroup: ${report.groupName} (${report.groupId})\nSender: ${report.senderName} (${report.senderId})\nReason: ${report.reason}\nReports so far: ${report.reports}${report.reports >= 2 ? " (taken down)" : ""}\n\n${report.preview}`,
    }),
  });
  if (!res.ok) throw new Error(`item report email ${res.status}`);
  return true;
}
