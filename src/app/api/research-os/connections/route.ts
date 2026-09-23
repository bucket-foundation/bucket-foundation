import { loadConnections } from "@/lib/research-os/connections-db";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "required", failed: () => bad(503, "access_unavailable") }, async (_req, { learnerId }) => {
  const connections = await loadConnections(learnerId);
  if ("unavailable" in connections && connections.unavailable) return bad(503, "access_unavailable");
  return connections;
});
