/**
 * GET /api/research-os/connections -> { held, bridges }
 * The person's cross-branch connections (connections.ts): edges other than
 * prerequisites between understood nodes in different branches, and the
 * bridges one step away. Auth: the site session or a Bearer token.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, verifyLearner } from "@/lib/research-os/db";
import { loadConnections } from "@/lib/research-os/connections-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  try {
    return NextResponse.json(await loadConnections(learnerId), NO_STORE);
  } catch {
    return bad(500, "read_failed");
  }
}
