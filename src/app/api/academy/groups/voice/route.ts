import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { uuidOrNull } from "@/lib/academy/groups";
import { shareRpcError, toSharedItem, type SharedItemRow } from "@/lib/academy/group-shares";
import { deleteImage, shareLimited, signedImageUrls, uploadAudio } from "@/lib/academy/group-shares-server";
import { normalizeVoice, voiceErrorStatus, voicePath } from "@/lib/academy/group-voice";
import { configured, fail, json, membersOf, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  if (shareLimited(uid)) return json({ error: "share_limit" }, 429);
  const body = await readBody(req);
  const groupId = uuidOrNull(body?.groupId);
  if (!groupId) return json({ error: "bad_request" }, 400);
  const voice = normalizeVoice(body);
  if (typeof voice === "string") return json({ error: voice }, voiceErrorStatus(voice));
  let uploaded: string | null = null;
  try {
    const members = await membersOf([groupId]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    uploaded = voicePath(groupId, randomUUID());
    await uploadAudio(uploaded, voice.audio);
    const res = await service().rpc("send_voice_note", { p_group: groupId, p_sender: uid, p_body: voice.transcript, p_audio_path: uploaded, p_duration_ms: voice.durationMs, p_lang: voice.lang });
    if (res.error) {
      const known = shareRpcError(res.error.message);
      if (known) {
        await deleteImage(uploaded).catch(() => null);
        return json({ error: known.error }, known.status);
      }
      throw new Error(`send_voice_note: ${res.error.message}`);
    }
    const row = (Array.isArray(res.data) ? res.data[0] : res.data) as SharedItemRow | undefined;
    if (!row) throw new Error("send_voice_note: no row");
    const urls = await signedImageUrls([uploaded]).catch(() => new Map<string, string>());
    return json({ item: toSharedItem(row, members, uid, { audioUrl: urls.get(uploaded) ?? null, viewerLang: voice.lang }) });
  } catch (err) {
    if (uploaded) await deleteImage(uploaded).catch(() => null);
    return fail(err, "voice");
  }
}
