import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { uuidOrNull } from "@/lib/academy/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { MEETUP_TERMS_VERSION, rejectedContent } from "@/lib/polingual/meetups";
import { meetupById, present, pushText } from "@/lib/polingual/meetups-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const id = uuidOrNull(params.id);
  const body = await readBody(req);
  const going = body?.going === true;
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  if (!id || (going && !name)) return json({ error: "bad_request" }, 400);
  if (going && rejectedContent(name)) return json({ error: "content_rejected" }, 422);
  try {
    const res = await service().rpc("rsvp_meetup", { p_meetup: id, p_user: uid, p_terms: MEETUP_TERMS_VERSION, p_name: name || "-", p_going: going });
    if (res.error) throw new Error(`rsvp_meetup: ${res.error.message}`);
    const out = String(res.data);
    if (out === "not_found") return json({ error: "not_found" }, 404);
    if (out === "terms_required") return json({ error: out }, 403);
    if (["closed", "full", "rsvp_limit", "host"].includes(out)) return json({ error: out }, 409);
    const row = await meetupById(id);
    if (!row) return json({ error: "not_found" }, 404);
    if (out === "joined_first" && row.host_id) await pushText([row.host_id], `${name} is going to ${row.title}`, id).catch(() => undefined);
    const [meetup] = await present([row], uid);
    return json({ meetup });
  } catch (err) {
    return fail(err, "meetup rsvp");
  }
}
