/**
 * The person's classes.
 * GET  /api/research-os/classes            -> { classes: ClassSummary[] }
 * POST /api/research-os/classes { action: "create", name } -> { class }
 * POST /api/research-os/classes { action: "join", code }   -> { class }
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, verifyLearnerIdentity } from "@/lib/research-os/db";
import { createClass, joinClass, listMyClasses } from "@/lib/research-os/classes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const user = await verifyLearnerIdentity(req);
  if (!user) return bad(401, "unauthorized");
  return NextResponse.json({ classes: await listMyClasses(user.id) }, NO_STORE);
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const user = await verifyLearnerIdentity(req);
  if (!user) return bad(401, "unauthorized");
  let body: { action?: string; name?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }
  if (body.action === "create") {
    const r = await createClass(user.id, user.email, String(body.name ?? ""));
    return r.ok ? NextResponse.json({ class: r.value }, NO_STORE) : bad(r.error === "bad_name" ? 400 : 500, r.error);
  }
  if (body.action === "join") {
    const r = await joinClass(user.id, String(body.code ?? ""));
    return r.ok ? NextResponse.json({ class: r.value }, NO_STORE) : bad(r.error === "not_found" ? 404 : r.error === "bad_code" ? 400 : 500, r.error);
  }
  return bad(400, "bad_action");
}
