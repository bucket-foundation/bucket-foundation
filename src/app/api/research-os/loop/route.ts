/**
 * GET /api/research-os/loop -> the person's five levels as live state.
 * One read for the home page's loop block: what they can see and own
 * (Access), what they have opened and where it leads (Awareness), what they
 * hold (Understanding), what connects across branches (Internalization),
 * and what they have produced and what it became (Production).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { loadConnections } from "@/lib/research-os/connections-db";
import { stageAtLeast } from "@/lib/research-os/types";
import type { Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

async function learnDecksStarted(userId: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;
  try {
    const svc = createClient(url, key, { db: { schema: "bucket" }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await svc.from("academy_progress").select("branch,data").eq("user_id", userId);
    return ((data as { data: { cards?: Record<string, unknown> } }[]) || []).filter((r) => Object.keys(r.data?.cards ?? {}).length > 0).length;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  const svc = graphService();
  const [statesRes, ownedRes, importsRes, prodRes, requestsRes, connections, decks] = await Promise.all([
    svc.from("learner_node_state").select("node_id,stage").eq("learner_id", learnerId),
    svc.from("nodes").select("id", { count: "exact", head: true }).eq("owner_id", learnerId),
    svc.from("imports").select("id", { count: "exact", head: true }).eq("owner_id", learnerId),
    svc.from("productions").select("id,status,kind,node_id,target_node_id,claim,updated_at").eq("learner_id", learnerId).order("updated_at", { ascending: false }),
    svc.from("access_requests").select("id", { count: "exact", head: true }).eq("requester_id", learnerId).eq("status", "pending"),
    loadConnections(learnerId).catch(() => ({ held: [], bridges: [] })),
    learnDecksStarted(learnerId),
  ]);
  const states = ((statesRes.data as { node_id: string; stage: Stage }[]) || []);
  const atLeast = (s: Stage) => states.filter((r) => stageAtLeast(r.stage, s)).length;
  const productions = ((prodRes.data as { id: string; status: string; kind: string; node_id: string | null; target_node_id: string; claim: string | null; updated_at: string }[]) || []);
  const byStatus = (st: string) => productions.filter((p) => p.status === st).length;
  return NextResponse.json(
    {
      access: { owned: ownedRes.count ?? 0, imports: importsRes.count ?? 0, pendingRequests: requestsRes.count ?? 0 },
      awareness: { opened: states.length, atLeastAwareness: atLeast("awareness") },
      understanding: { nodes: atLeast("understanding"), decksStarted: decks },
      internalization: { nodes: atLeast("internalization"), held: connections.held.length, bridges: connections.bridges.length, nextBridge: connections.bridges[0]?.next ?? null },
      production: {
        drafts: byStatus("draft"),
        submitted: byStatus("submitted"),
        accepted: byStatus("accepted"),
        returned: byStatus("returned"),
        nodes: productions.filter((p) => p.node_id).length,
        latest: productions[0] ?? null,
      },
      empty: states.length === 0 && productions.length === 0 && (ownedRes.count ?? 0) === 0 && decks === 0,
    },
    NO_STORE
  );
}
