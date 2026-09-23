import { NextRequest, NextResponse } from "next/server";
import { configured } from "@/lib/research-os/db";
import { overrideLevel, verifyClassStaff } from "@/lib/research-os/class-db";
import { STAGE_ORDER, type Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  let body: { classId?: string; learnerId?: string; nodeId?: string; toStage?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }
  const { classId, learnerId, nodeId, toStage, reason } = body;
  if (!classId || !learnerId || !nodeId || !toStage) return bad(400, "class_learner_node_level_required");
  if (!STAGE_ORDER.includes(toStage as Stage)) return bad(400, "bad_level");
  const staffCheck = await verifyClassStaff(req, classId);
  if (!staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck.staff;
  if (!staff) return bad(403, "forbidden");
  const r = await overrideLevel(staff, classId, learnerId, nodeId, toStage as Stage, reason || "");
  if (r.ok) return NextResponse.json(r.value, NO_STORE);
  if (r.error === "busy") {
    return NextResponse.json(
      { error: "busy" },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "1" } },
    );
  }
  if (r.error === "unavailable") return bad(503, "class_read_failed");
  const status = r.error === "forbidden" ? 403 : r.error === "not_a_member" ? 404 : r.error === "write_failed" ? 500 : 400;
  return bad(status, r.error);
}
