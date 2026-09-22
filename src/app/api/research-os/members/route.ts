/**
 * Research OS, class memberships with roles (ros-27).
 *
 * GET  /api/research-os/members?class=<id>          staff: the roster with roles
 * POST /api/research-os/members { classId, userId, role, relatedLearnerId? }
 *   staff (teacher or librarian) sets a member's role; parent takes the
 *   learner they relate to.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured } from "@/lib/research-os/db";
import { listMembers, setMemberRole, verifyClassStaff } from "@/lib/research-os/class-db";
import { ROLES, type Role } from "@/lib/research-os/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const classId = new URL(req.url).searchParams.get("class");
  if (!classId) return bad(400, "class_required");
  const staffCheck = await verifyClassStaff(req, classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  return NextResponse.json({ members: await listMembers(classId), roles: staff.roles }, NO_STORE);
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  let body: { classId?: string; userId?: string; role?: string; relatedLearnerId?: string | null };
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }
  if (!body.classId || !body.userId || !body.role) return bad(400, "class_user_role_required");
  if (!ROLES.includes(body.role as Role)) return bad(400, "bad_role");
  const staffCheck = await verifyClassStaff(req, body.classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  const r = await setMemberRole(staff, body.classId, body.userId, body.role as Role, body.relatedLearnerId);
  return r.ok ? NextResponse.json({ member: r.value }, NO_STORE) : bad(r.error === "forbidden" ? 403 : 500, r.error);
}
