import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { hiddenUsers, uuidOrNull } from "@/lib/academy/groups";
import { imagePath, normalizeShare, shareRpcError, toSharedItem, visibleItems, type SharedItemRow } from "@/lib/academy/group-shares";
import { deleteImage, itemsOf, reportedBy, shareLimited, signedImageUrls, uploadImage } from "@/lib/academy/group-shares-server";
import { voiceLang } from "@/lib/academy/group-voice";
import { blocksTouching, configured, fail, json, membersOf, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const groupId = uuidOrNull(req.nextUrl.searchParams.get("groupId"));
  if (!groupId) return json({ error: "bad_request" }, 400);
  const voice = req.nextUrl.searchParams.get("voice") === "1";
  const viewerLang = voiceLang(req.nextUrl.searchParams.get("lang"));
  try {
    const members = await membersOf([groupId]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const [rows, blocks] = await Promise.all([itemsOf(groupId), blocksTouching(uid)]);
    const reported = await reportedBy(uid, rows.map((r) => r.id));
    const shown = visibleItems(rows, uid, hiddenUsers(blocks, uid), reported, voice);
    const urls = await signedImageUrls(shown.flatMap((r) => [r.image_path, r.audio_path].filter((p): p is string => !!p)));
    const signed = (p: string | null | undefined) => (p ? urls.get(p) ?? null : null);
    return json({ items: shown.map((r) => toSharedItem(r, members, uid, { imageUrl: signed(r.image_path), audioUrl: signed(r.audio_path), viewerLang })) });
  } catch (err) {
    return fail(err, "share list");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  if (shareLimited(uid)) return json({ error: "share_limit" }, 429);
  const body = await readBody(req);
  const groupId = uuidOrNull(body?.groupId);
  const to = body?.to === undefined || body?.to === null ? null : uuidOrNull(body.to);
  if (!groupId || (body?.to !== undefined && body?.to !== null && !to) || to === uid) return json({ error: "bad_request" }, 400);
  const share = normalizeShare(body);
  if (typeof share === "string") return json({ error: share }, share === "text_not_allowed" ? 422 : share === "image_too_large" ? 413 : 400);
  let uploaded: string | null = null;
  try {
    const members = await membersOf([groupId]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    if (to && !members.some((m) => m.user_id === to)) return json({ error: "not_found" }, 404);
    if (to && hiddenUsers(await blocksTouching(uid), uid).has(to)) return json({ error: "not_found" }, 404);
    if (share.image) {
      uploaded = imagePath(groupId, randomUUID());
      await uploadImage(uploaded, share.image);
    }
    const res = await service().rpc("send_shared_item", { p_group: groupId, p_sender: uid, p_recipient: to, p_kind: share.kind, p_url: share.url, p_body: share.body, p_image_path: uploaded });
    if (res.error) {
      const known = shareRpcError(res.error.message);
      if (uploaded) await deleteImage(uploaded).catch(() => null);
      if (known) return json({ error: known.error }, known.status);
      throw new Error(`send_shared_item: ${res.error.message}`);
    }
    const row = (Array.isArray(res.data) ? res.data[0] : res.data) as SharedItemRow | undefined;
    if (!row) throw new Error("send_shared_item: no row");
    return json({ item: toSharedItem(row, members, uid) });
  } catch (err) {
    if (uploaded) await deleteImage(uploaded).catch(() => null);
    return fail(err, "share");
  }
}
