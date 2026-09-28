import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import { gripFor, demonstratedKeys } from "@/lib/research-os/grip";
import { loadAssessVerdicts, loadGripCatalog } from "@/lib/research-os/grip-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "required" }, async (_req, { learnerId }) => {
  let catalog: Awaited<ReturnType<typeof loadGripCatalog>>;
  let verdicts: Awaited<ReturnType<typeof loadAssessVerdicts>>;
  try {
    [catalog, verdicts] = await Promise.all([loadGripCatalog(learnerId), loadAssessVerdicts(learnerId)]);
  } catch (err) {
    console.error("[research-os/grip] read failed:", err instanceof Error ? err.message : String(err));
    return bad(503, "graph_read_failed");
  }
  const grip = gripFor(catalog.nodes, catalog.edges, demonstratedKeys(verdicts));
  return { ...grip, evidence: "assess_done auto-graded, self-reported", certified: false, assessedItems: verdicts.filter((v) => v.autoGraded).length };
});
