/**
 * Research OS, frontier flags (ros-31): mark a node as an open question or
 * as the frontier of its branch, or clear the flag. Class staff (a teacher
 * or librarian membership, or the class's reviewer email) and reviewer
 * emails may set it.
 *
 * GET  /api/research-os/frontier?branch=<slug>  -> { openQuestions: [...], frontier: [...] } (public)
 * POST /api/research-os/frontier { nodeId, flag: "open_question" | "frontier" | null, classId? }
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { verifyClassStaff } from "@/lib/research-os/class-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const branch = (new URL(req.url).searchParams.get("branch") || "02-physics").trim();
  const { data, error } = await graphService()
    .from("nodes")
    .select("id,slug,title,kind,tier,frontier_flag")
    .eq("branch", branch)
    .eq("visibility", "public")
    .not("frontier_flag", "is", null)
    .order("tier", { ascending: true });
  if (error) return bad(500, "read_failed");
  const rows = (data as { id: string; slug: string; title: string; kind: string; tier: number; frontier_flag: string }[]) || [];
  return NextResponse.json(
    { openQuestions: rows.filter((r) => r.frontier_flag === "open_question"), frontier: rows.filter((r) => r.frontier_flag === "frontier") },
    NO_STORE
  );
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  let body: { nodeId?: string; flag?: string | null; classId?: string };
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }
  if (!body.nodeId) return bad(400, "node_required");
  if (body.flag !== null && body.flag !== undefined && body.flag !== "open_question" && body.flag !== "frontier") return bad(400, "bad_flag");
  const reviewer = await verifyReviewer(req);
  const staffCheck = body.classId ? await verifyClassStaff(req, body.classId) : null;
  if (staffCheck && !staffCheck.ok) return bad(503, "class_read_failed");
  const staff = staffCheck?.ok ? staffCheck.staff : null;
  const allowed = Boolean(reviewer) || Boolean(staff && staff.roles.some((r) => r === "teacher" || r === "librarian" || r === "reviewer"));
  if (!allowed) return bad(403, "forbidden");
  const { error } = await graphService().from("nodes").update({ frontier_flag: body.flag ?? null }).eq("id", body.nodeId);
  if (error) return bad(500, "write_failed");
  return NextResponse.json({ ok: true, flag: body.flag ?? null }, NO_STORE);
}
