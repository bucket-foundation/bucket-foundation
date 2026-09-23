import { verifyLearner } from "@/lib/research-os/db";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";
import { closeAssignment, createAssignment, listAssignments, listAssignmentsForLearner, verifyClassStaff } from "@/lib/research-os/class-db";
import { grantAccess, loadNodeAccess } from "@/lib/research-os/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("mine")) {
    const learnerId = await verifyLearner(req);
    if (!learnerId) return bad(401, "unauthorized");
    const mine = await listAssignmentsForLearner(learnerId);
    if (!mine.ok) return bad(503, "access_unavailable");
    return { assignments: mine.assignments };
  }
  const classId = searchParams.get("class");
  if (!classId) return bad(400, "class_required");
  const staffCheck = await verifyClassStaff(req, classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  const staffList = await listAssignments(classId);
  if (!staffList.ok) return bad(503, "access_unavailable");
  return { assignments: staffList.assignments, roles: staff.roles };
});

type Body =
  | { action: "create"; classId: string; targetSlug: string; title: string; instructions?: string; dueAt?: string; required?: boolean; requiresProduction?: boolean }
  | { action: "close"; classId: string; assignmentId: string };

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const read = await readAnyJson(req);
  if (!read.ok) return read.res;
  const body = read.value as Body | null;
  if (!body?.classId) return bad(400, "class_required");
  const staffCheck = await verifyClassStaff(req, body.classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  if (body.action === "create") {
    if (!body.targetSlug?.trim()) return bad(400, "target_required");
    const r = await createAssignment(staff, body.classId, body.targetSlug.trim(), body);
    if (!r.ok && r.error === "unavailable") return bad(503, "class_read_failed");
    if (!r.ok) return bad(r.error === "forbidden" ? 403 : r.error === "write_failed" ? 500 : 400, r.error);
    try {
      const nodeRead = await loadNodeAccess(r.value.targetNodeId);
      const node = nodeRead.ok ? nodeRead.value : null;
      if (node && node.visibility !== "public" && node.ownerId === staff.id) {
        await grantAccess(node, { id: staff.id, groups: [] }, { group: `class:${body.classId}` }, "view");
      }
    } catch {
    }
    return { assignment: r.value };
  }
  if (body.action === "close") {
    if (!body.assignmentId) return bad(400, "assignment_required");
    const r = await closeAssignment(staff, body.classId, body.assignmentId);
    return r.ok ? { ok: true } : bad(r.error === "forbidden" ? 403 : 500, r.error);
  }
  return bad(400, "unknown_action");
});
