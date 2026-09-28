import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import { dbPlanStore, loadPlan, type PlanNode } from "@/lib/research-os/learning-plan-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export const GET = withResearchOsRoute({ auth: "optional" }, async (req, { learnerId }) => {
  const slug = (new URL(req.url).searchParams.get("target") || "").trim();
  if (!SLUG.test(slug)) return bad(400, "target_required");
  const loaded = await loadPlan(dbPlanStore, slug, learnerId);
  if (loaded.status === "not_found") return bad(404, "target_not_found");
  if (loaded.status === "unavailable") return { status: "unavailable", certified: false };
  const base = { objective: "unit_concepts", certified: false, mastery: learnerId ? "practice" : "none", target: loaded.target };
  if (loaded.status === "limit") return { ...base, status: "limit" };
  const { plan, nodes } = loaded;
  const pick = (ids: string[]): PlanNode[] => ids.map((id) => nodes[id]).filter(Boolean);
  if (plan.status === "ready") {
    return {
      ...base,
      status: "ready",
      requiredCount: plan.required.length,
      masteredCount: plan.mastered.length,
      studyOrder: pick(plan.studyOrder),
      ready: pick(plan.ready),
      chain: pick(plan.chain),
    };
  }
  if (plan.status === "mastery_conflict") return { ...base, status: "mastery_conflict", conflicts: pick(plan.nodes) };
  return { ...base, status: plan.status };
});
