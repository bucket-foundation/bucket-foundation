/**
 * /api/canon/signoff, the human sign-off tool's web route (GOVERNANCE.md's
 * "Canon sign-off" section; CLI counterpart at
 * tools/canon-pipeline/signoff.py). Reuses src/lib/canon-signoff.ts, the
 * shared module GET and POST both call so the approve/reject logic lives
 * in exactly one place in this app.
 *
 * Auth stacks two allowlists: `Authorization: Bearer <supabase access
 * token>` verified against src/lib/research-os/reviewer.ts's
 * RESEARCH_OS_REVIEWER_EMAILS (the existing reviewer gate), AND the
 * caller's email on src/lib/canon-signoff-approvers.ts's
 * CANON_SIGNOFF_APPROVERS. A Research OS teacher reviewer who is not on
 * the second, narrower allowlist gets 403 here even though the first gate
 * passes: reviewer status alone never authorizes a canon approval.
 * Neither allowlist's membership is ever returned to the client; a caller
 * who fails either gate sees the same {error:"forbidden"} 403 either way.
 *
 * GET  -> { records: PendingRecord[] }, every pending record, sorted by
 *   canon_score desc.
 * POST { action: "approve", record } | { action: "reject", record, reason }
 *   -> { ok: true, result }. `record` is a record id, "<path>#<id>", or a
 *   path with exactly one pending record (see canon-signoff.ts's
 *   findRecord). The approver identity is always the verified reviewer's
 *   own email, never a client-supplied field, so attribution cannot be
 *   spoofed. approve always runs the live DOI HEAD-request check (no
 *   client-settable bypass here; the CLI's --offline is CLI-only, for the
 *   no-DOI/offline cases a human operator judges directly).
 *
 * 403 not a reviewer, or a reviewer not on CANON_SIGNOFF_APPROVERS
 *   (also covers an unset/empty allowlist, fail closed) - 400 bad input -
 *   500 the underlying write failed (e.g. a read-only deployment
 *   filesystem; see canon-signoff.ts's own top docstring "OPERATIONAL
 *   NOTE").
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { isCanonSignoffApprover } from "@/lib/canon-signoff-approvers";
import { listPending, approve, reject, SignoffError } from "@/lib/canon-signoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function authorize(req: NextRequest): Promise<string | null> {
  const reviewer = await verifyReviewer(req);
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
