import { graphService } from "@/lib/research-os/db";
import { loadPrimesReport } from "@/lib/research-os/primes-report";
import { bad, ok, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none" }, async () => {
  try {
    return ok({ ...(await loadPrimesReport(graphService())) });
  } catch (err) {
    console.error("[primes-report] failed:", err instanceof Error ? err.message : err);
    return bad(503, "graph_unavailable");
  }
});
