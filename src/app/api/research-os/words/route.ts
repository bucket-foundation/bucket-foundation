import { NextRequest, NextResponse } from "next/server";
import { configured, verifyLearnerIdentity } from "@/lib/research-os/db";
import { authorizeNode } from "@/lib/research-os/read-access";
import { loadNodeWords } from "@/lib/research-os/node-words-db";
import { KAIKKI_ATTRIBUTION } from "@/lib/research-os/node-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  if (!UUID.test(id)) return bad(400, "id_required");
  const identity = await verifyLearnerIdentity(req);
  const readable = await authorizeNode(id, { id: identity?.id ?? null }, "view");
  if (!readable.ok) {
    if (readable.reason === "unavailable") return bad(503, "access_unavailable");
    return bad(404, "node_not_found");
  }
  try {
    const words = await loadNodeWords(id);
    return NextResponse.json({ words, attribution: KAIKKI_ATTRIBUTION }, NO_STORE);
  } catch (err) {
    console.error("[research-os/words] read failed:", err instanceof Error ? err.message : err);
    return bad(503, "graph_read_failed");
  }
}
