import type { LoopResponse } from "@/lib/research-os/loop-shape";
import { createClient } from "@supabase/supabase-js";
import { graphService, pagedRead } from "@/lib/research-os/db";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import { loadConnections } from "@/lib/research-os/connections-db";
import { stageAtLeast } from "@/lib/research-os/types";
import type { Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function learnDecksStarted(userId: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;
  const svc = createClient(url, key, { db: { schema: "bucket" }, auth: { persistSession: false, autoRefreshToken: false } });
  const rows = await pagedRead<{ data: { cards?: Record<string, unknown> } }>((page) =>
    svc.from("academy_progress").select("branch,data").eq("user_id", userId).order("branch").range(page.from, page.to) as unknown as Promise<{ data: { data: { cards?: Record<string, unknown> } }[] | null; error: { message: string } | null }>,
  );
  return rows.filter((r) => Object.keys(r.data?.cards ?? {}).length > 0).length;
}

async function counted(query: PromiseLike<{ count: number | null; error: { message: string } | null }>, what: string): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return count ?? 0;
}

export const GET = withResearchOsRoute({ auth: "required" }, async (_req, { learnerId }) => {
  const svc = graphService();
  let reads;
  try {
    reads = await Promise.all([
    pagedRead<{ node_id: string; stage: string }>((page) =>
      svc.from("learner_node_state").select("node_id,stage").eq("learner_id", learnerId).order("node_id").range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; stage: string }[] | null; error: { message: string } | null }>,
    ),
      counted(svc.from("nodes").select("id", { count: "exact", head: true }).eq("owner_id", learnerId), "nodes"),
      counted(svc.from("imports").select("id", { count: "exact", head: true }).eq("owner_id", learnerId), "imports"),
    pagedRead<{ id: string; status: string; kind: string; node_id: string | null; target_node_id: string; claim: string | null; updated_at: string }>((page) =>
      svc.from("productions").select("id,status,kind,node_id,target_node_id,claim,updated_at").eq("learner_id", learnerId).order("updated_at", { ascending: false }).order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; status: string; kind: string; node_id: string | null; target_node_id: string; claim: string | null; updated_at: string }[] | null; error: { message: string } | null }>,
    ),
      counted(svc.from("access_requests").select("id", { count: "exact", head: true }).eq("requester_id", learnerId).eq("status", "pending"), "access_requests"),
    loadConnections(learnerId).catch(() => ({ held: [], bridges: [], unavailable: true as const })),
    learnDecksStarted(learnerId),
    ]);
  } catch (err) {
    console.error("[research-os/loop] read failed:", err instanceof Error ? err.message : err);
    return bad(503, "loop_unavailable");
  }
  const [statesRes, ownedRes, importsRes, prodRes, requestsRes, connections, decks] = reads;
  const states = (statesRes as { node_id: string; stage: Stage }[]) || [];
  const atLeast = (s: Stage) => states.filter((r) => stageAtLeast(r.stage, s)).length;
  const productions = (prodRes as { id: string; status: string; kind: string; node_id: string | null; target_node_id: string; claim: string | null; updated_at: string }[]) || [];
  const byStatus = (st: string) => productions.filter((p) => p.status === st).length;
  const payload: LoopResponse = {
      access: { owned: ownedRes, imports: importsRes, pendingRequests: requestsRes },
      awareness: { opened: states.length, atLeastAwareness: atLeast("awareness") },
      understanding: { nodes: atLeast("understanding"), decksStarted: decks },
      internalization: {
        nodes: atLeast("internalization"),
        ...("unavailable" in connections && connections.unavailable
          ? { held: null, bridges: null, nextBridge: null }
          : { held: connections.held.length, bridges: connections.bridges.length, nextBridge: connections.bridges[0]?.next ?? null }),
      },
      production: {
        drafts: byStatus("draft"),
        submitted: byStatus("submitted"),
        accepted: byStatus("accepted"),
        returned: byStatus("returned"),
        nodes: productions.filter((p) => p.node_id).length,
        latest: productions[0] ?? null,
      },
      empty: states.length === 0 && productions.length === 0 && ownedRes === 0 && decks === 0,
  };
  return payload;
});
