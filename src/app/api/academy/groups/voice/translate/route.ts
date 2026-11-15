import type { NextRequest, NextResponse } from "next/server";
import { hiddenUsers, uuidOrNull } from "@/lib/academy/groups";
import { visibleItems } from "@/lib/academy/group-shares";
import { cacheTranslation, itemById, llmTranslator, reportedBy, translateLimited } from "@/lib/academy/group-shares-server";
import { translateVoice, voiceLang } from "@/lib/academy/group-voice";
import { blocksTouching, configured, fail, json, membersOf, preflight, readBody, requestUser } from "@/lib/academy/groups-server";
import type { LlmError } from "@/lib/llm/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const itemId = uuidOrNull(body?.itemId);
  const lang = voiceLang(body?.lang);
  if (!itemId || !lang) return json({ error: "bad_request" }, 400);
  try {
    const row = await itemById(itemId);
    if (!row || row.kind !== "voice") return json({ error: "not_found" }, 404);
    const members = await membersOf([row.group_id]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const [blocks, reported] = await Promise.all([blocksTouching(uid), reportedBy(uid, [row.id])]);
    if (visibleItems([row], uid, hiddenUsers(blocks, uid), reported).length === 0) return json({ error: "not_found" }, 404);
    const needsModel = !!row.body && row.lang !== lang && !row.translations?.[lang];
    if (needsModel && translateLimited(uid)) return json({ error: "rate_limited" }, 429);
    const text = await translateVoice(row, lang, llmTranslator, (t) => cacheTranslation(row.id, lang, t));
    return json({ itemId: row.id, lang, text });
  } catch (err) {
    if ((err as LlmError)?.status === 503) return json({ error: "translate_unavailable" }, 503);
    return fail(err, "voice translate");
  }
}
