/**
 * Research OS, level overrides (the Class step): a teacher or librarian
 * sets a learner's level on a node with a recorded reason.
 *
 * POST /api/research-os/override { classId, learnerId, nodeId, toStage, reason }
 *   -> { fromStage, toStage }
 *
 * Writes graph.level_overrides and an "override" evidence event on the
 * learner's node state (recordEvidence), so the game layer and the class
 * view read it like any other transition.
 */
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
  const staff = await verifyClassStaff(req, classId);
  if (!staff) return bad(403, "forbidden");
  const r = await overrideLevel(staff, classId, learnerId, nodeId, toStage as Stage, reason || "");
  if (r.ok) return NextResponse.json(r.value, NO_STORE);
  const status = r.error === "forbidden" ? 403 : r.error === "not_a_member" ? 404 : r.error === "write_failed" ? 500 : 400;
  return bad(status, r.error);
}
