import { NextResponse } from "next/server";
import { overrideLevel, verifyClassStaff } from "@/lib/research-os/class-db";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";
import { STAGE_ORDER, type Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const read = await readAnyJson(req);
  if (!read.ok) return read.res;
  const { classId, learnerId, nodeId, toStage, reason } = (read.value ?? {}) as { classId?: string; learnerId?: string; nodeId?: string; toStage?: string; reason?: string };
  if (!classId || !learnerId || !nodeId || !toStage) return bad(400, "class_learner_node_level_required");
  if (!STAGE_ORDER.includes(toStage as Stage)) return bad(400, "bad_level");
  const staffCheck = await verifyClassStaff(req, classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  const r = await overrideLevel(staff, classId, learnerId, nodeId, toStage as Stage, reason || "");
  if (r.ok) return r.value;
  if (r.error === "busy") return NextResponse.json({ error: "busy" }, { status: 503, headers: { "retry-after": "1" } });
  if (r.error === "unavailable") return bad(503, "class_read_failed");
  const status = r.error === "forbidden" ? 403 : r.error === "not_a_member" ? 404 : r.error === "write_failed" ? 500 : 400;
  return bad(status, r.error);
});
