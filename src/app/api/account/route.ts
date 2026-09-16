/**
 * The signed-in person's account.
 * GET  /api/account -> { user: { id, email }, identity }
 * POST /api/account { handle?, displayName? } -> { identity }
 * Auth: the site cookie session or a Bearer token (verifyLearnerIdentity).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyLearnerIdentity } from "@/lib/research-os/db";
import { getIdentity, setDisplayName, setHandle } from "@/lib/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };

export async function GET(req: NextRequest) {
  const user = await verifyLearnerIdentity(req);
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, ...NO_STORE });
  const identity = await getIdentity(user.id);
  return NextResponse.json({ user, identity }, NO_STORE);
}

export async function POST(req: NextRequest) {
  const user = await verifyLearnerIdentity(req);
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, ...NO_STORE });
  let body: { handle?: unknown; displayName?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, ...NO_STORE });
  }
  let identity = await getIdentity(user.id);
  if (typeof body.handle === "string") {
    const r = await setHandle(user.id, body.handle);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "unavailable" ? 503 : r.error === "handle_taken" ? 409 : 400, ...NO_STORE });
    identity = r.value;
  }
  if (typeof body.displayName === "string") {
    const r = await setDisplayName(user.id, body.displayName);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "unavailable" ? 503 : 400, ...NO_STORE });
    identity = r.value;
  }
  return NextResponse.json({ identity }, NO_STORE);
}
