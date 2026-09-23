import { NextRequest, NextResponse } from "next/server";
import { deleteLearnerData, exportLearnerData, isDeleteConfirmed, privacyConfigured, resolvePrivacyActor } from "@/lib/research-os/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface PrivacyBody {
  action?: "export" | "delete";
  learnerId?: string;
  confirm?: string;
}

export async function POST(req: NextRequest) {
  if (!privacyConfigured()) return bad(503, "research_os_unavailable");

  let body: PrivacyBody;
  try {
    body = (await req.json()) as PrivacyBody;
  } catch {
    return bad(400, "bad_request");
  }
  if (body.action !== "export" && body.action !== "delete") {
    return bad(400, 'action must be "export" or "delete"');
  }

  if (body.action === "delete" && !isDeleteConfirmed(body)) {
    return bad(400, "confirm_required");
  }

  const actor = await resolvePrivacyActor(req, body.learnerId);
  if (!actor) return bad(401, "unauthorized");

  if (body.action === "export") {
    const envelope = await exportLearnerData(actor);
    return NextResponse.json(envelope, { headers: { "cache-control": "no-store" } });
  }

  try {
    const result = await deleteLearnerData(actor);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return bad(500, "delete_failed");
  }
}
