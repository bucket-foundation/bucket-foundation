import { verifyLearnerIdentity } from "@/lib/research-os/db";
import { authorizeNode } from "@/lib/research-os/read-access";
import { loadNodeWords } from "@/lib/research-os/node-words-db";
import { KAIKKI_ATTRIBUTION } from "@/lib/research-os/node-words";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  if (!UUID.test(id)) return bad(400, "id_required");
  const identity = await verifyLearnerIdentity(req);
  const readable = await authorizeNode(id, { id: identity?.id ?? null }, "view");
  if (!readable.ok) return readable.reason === "unavailable" ? bad(503, "access_unavailable") : bad(404, "node_not_found");
  try {
    return { words: await loadNodeWords(id), attribution: KAIKKI_ATTRIBUTION };
  } catch (err) {
    console.error("[research-os/words] read failed:", err instanceof Error ? err.message : err);
    return bad(503, "graph_read_failed");
  }
});
