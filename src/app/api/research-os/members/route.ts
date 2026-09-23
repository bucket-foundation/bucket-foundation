import { listMembers, setMemberRole, verifyClassStaff } from "@/lib/research-os/class-db";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";
import { ROLES, type Role } from "@/lib/research-os/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none", failed: () => bad(503, "class_read_failed") }, async (req) => {
  const classId = new URL(req.url).searchParams.get("class");
  if (!classId) return bad(400, "class_required");
  const staffCheck = await verifyClassStaff(req, classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  return { members: await listMembers(classId), roles: staff.roles };
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const read = await readAnyJson(req);
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as { classId?: string; userId?: string; role?: string; relatedLearnerId?: string | null };
  if (!body.classId || !body.userId || !body.role) return bad(400, "class_user_role_required");
  if (!ROLES.includes(body.role as Role)) return bad(400, "bad_role");
  const staffCheck = await verifyClassStaff(req, body.classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  const r = await setMemberRole(staff, body.classId, body.userId, body.role as Role, body.relatedLearnerId);
  return r.ok ? { member: r.value } : bad(r.error === "forbidden" ? 403 : 500, r.error);
});
