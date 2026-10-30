import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { MEETUP_TERMS_VERSION } from "@/lib/polingual/meetups";
import { acceptTerms, termsAccepted } from "@/lib/polingual/meetups-server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  try {
    return json({ accepted: await termsAccepted(uid), version: MEETUP_TERMS_VERSION });
  } catch (err) {
    return fail(err, "meetup terms");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  if (body?.version !== MEETUP_TERMS_VERSION) return json({ error: "bad_request", version: MEETUP_TERMS_VERSION }, 400);
  try {
    await acceptTerms(uid);
    return json({ accepted: true, version: MEETUP_TERMS_VERSION });
  } catch (err) {
    return fail(err, "meetup terms accept");
  }
}
