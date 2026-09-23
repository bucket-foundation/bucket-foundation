import { graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { verifyClassStaff } from "@/lib/research-os/class-db";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
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
  return { openQuestions: rows.filter((r) => r.frontier_flag === "open_question"), frontier: rows.filter((r) => r.frontier_flag === "frontier") };
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const read = await readAnyJson(req);
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as { nodeId?: string; flag?: string | null; classId?: string };
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
  return { ok: true, flag: body.flag ?? null };
});
