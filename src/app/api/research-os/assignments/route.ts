/**
 * Research OS, assignments (the Class step, decision 6).
 *
 * GET  /api/research-os/assignments?class=<id>   staff: every assignment in the class
 * GET  /api/research-os/assignments?mine=1       learner: open assignments across their classes, with status
 * POST /api/research-os/assignments
 *   { action: "create", classId, targetSlug, title, instructions?, dueAt?, required?, requiresProduction? }
 *   { action: "close",  classId, assignmentId }
 *
 * Auth: Authorization: Bearer <supabase access token>. Staff = the class's
 * reviewer_email or a teacher or librarian membership (class-db.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, verifyLearner } from "@/lib/research-os/db";
import { closeAssignment, createAssignment, listAssignments, listAssignmentsForLearner, verifyClassStaff } from "@/lib/research-os/class-db";
import { grantAccess, loadNodeAccess } from "@/lib/research-os/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const { searchParams } = new URL(req.url);
  if (searchParams.get("mine")) {
    const learnerId = await verifyLearner(req);
    if (!learnerId) return bad(401, "unauthorized");
    // The five reads behind this raise rather than flattening to an
    // empty list, so a failed one answers here.
    try {
      return NextResponse.json({ assignments: await listAssignmentsForLearner(learnerId) }, NO_STORE);
    } catch (err) {
      console.error("[research-os/assignments] read failed:", err instanceof Error ? err.message : err);
      return bad(503, "class_read_failed");
    }
  }
  const classId = searchParams.get("class");
  if (!classId) return bad(400, "class_required");
  const staffCheck = await verifyClassStaff(req, classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  try {
    return NextResponse.json({ assignments: await listAssignments(classId), roles: staff.roles }, NO_STORE);
  } catch (err) {
    console.error("[research-os/assignments] class read failed:", err instanceof Error ? err.message : err);
    return bad(503, "class_read_failed");
  }
}

type Body =
  | { action: "create"; classId: string; targetSlug: string; title: string; instructions?: string; dueAt?: string; required?: boolean; requiresProduction?: boolean }
  | { action: "close"; classId: string; assignmentId: string };

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad(400, "bad_json");
  }
  if (!body?.classId) return bad(400, "class_required");
  const staffCheck = await verifyClassStaff(req, body.classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  if (body.action === "create") {
    if (!body.targetSlug?.trim()) return bad(400, "target_required");
    const r = await createAssignment(staff, body.classId, body.targetSlug.trim(), body);
    // A read that did not complete is the server's problem. It used to
    // fall to the 400 every unlisted code took, which named the
    // teacher's own input as the thing that was wrong.
    if (!r.ok && r.error === "unavailable") return bad(503, "class_read_failed");
    if (!r.ok) return bad(r.error === "forbidden" ? 403 : r.error === "write_failed" ? 500 : 400, r.error);
    // A class is a region: a private or shared node the assigner owns becomes
    // visible to the class it is assigned to (IDEAL-STATE.md, Access × class).
    try {
      const node = await loadNodeAccess(r.value.targetNodeId);
      if (node && node.visibility !== "public" && node.ownerId === staff.id) {
        await grantAccess(node, { id: staff.id, groups: [] }, { group: `class:${body.classId}` }, "view");
      }
    } catch {
      /* the assignment stands; sharing is best-effort */
    }
    return NextResponse.json({ assignment: r.value }, NO_STORE);
  }
  if (body.action === "close") {
    if (!body.assignmentId) return bad(400, "assignment_required");
    const r = await closeAssignment(staff, body.classId, body.assignmentId);
    return r.ok ? NextResponse.json({ ok: true }, NO_STORE) : bad(r.error === "forbidden" ? 403 : 500, r.error);
  }
  return bad(400, "unknown_action");
}
