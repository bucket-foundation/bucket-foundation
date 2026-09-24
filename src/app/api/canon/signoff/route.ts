import { NextRequest, NextResponse } from "next/server";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { isCanonSignoffApprover } from "@/lib/canon-signoff-approvers";
import { listPending, approve, reject, SignoffError } from "@/lib/canon-signoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function authorize(req: NextRequest): Promise<string | null> {
  const reviewer = await verifyGraphReviewer(req);
  if (!isCanonSignoffApprover(!!reviewer, reviewer?.email)) return null;
  return reviewer!.email;
}

export async function GET(req: NextRequest) {
  const approver = await authorize(req);
  if (!approver) return bad(403, "forbidden");

  try {
    const records = listPending();
    return NextResponse.json({ records }, { headers: { "cache-control": "no-store" } });
  } catch {
    return bad(500, "list_failed");
  }
}

interface SignoffBody {
  action?: "approve" | "reject";
  record?: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  const approver = await authorize(req);
  if (!approver) return bad(403, "forbidden");

  let body: SignoffBody;
  try {
    body = (await req.json()) as SignoffBody;
  } catch {
    return bad(400, "bad_request");
  }

  if (body.action !== "approve" && body.action !== "reject") return bad(400, "action must be approve or reject");
  const record = (body.record || "").trim();
  if (!record) return bad(400, "record is required");

  try {
    if (body.action === "approve") {
      const result = await approve(record, approver);
      return NextResponse.json({ ok: true, result }, { headers: { "cache-control": "no-store" } });
    }
    const reason = (body.reason || "").trim();
    if (!reason) return bad(400, "a reason is required to reject a record");
    const result = await reject(record, approver, reason);
    return NextResponse.json({ ok: true, result }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof SignoffError) return bad(400, e.message);
    return bad(500, "signoff_failed");
  }
}
