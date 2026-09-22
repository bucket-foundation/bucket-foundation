/**
 * GET /api/research-os/loop -> the person's five levels as live state.
 * One read for the home page's loop block: what they can see and own
 * (Access), what they have opened and where it leads (Awareness), what they
 * hold (Understanding), what connects across branches (Internalization),
 * and what they have produced and what it became (Production).
 */
import type { LoopResponse } from "@/lib/research-os/loop-shape";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configured, graphService, pagedRead, verifyLearner } from "@/lib/research-os/db";
import { loadConnections } from "@/lib/research-os/connections-db";
import { stageAtLeast } from "@/lib/research-os/types";
import type { Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

/**
 * Decks the learner has started, from the Academy schema.
 *
 * The error was discarded and the catch answered 0, so a failed read
 * reported no decks and flipped `empty`, showing the first-run screen to
 * a learner whose only work is a started deck (Bucket critic C70). A
 * stack with no Academy configured is a different fact and still
 * answers 0.
 */
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

/**
 * A head count that fails is an outage, the way a paged read that fails
 * is one. A head count resolves with `{count: null, error}` and never
 * throws, so `?? 0` reported a failed read as a learner who owns
 * nothing (Bucket critic C58).
 */
async function counted(query: PromiseLike<{ count: number | null; error: { message: string } | null }>, what: string): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return count ?? 0;
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  const svc = graphService();
  // A read that fails is an outage. Before these reads paged, a failure
  // left the data null and every counter rendered zero, which told the
  // learner they had opened nothing. pagedRead and counted() throw
  // instead, and the throw becomes a 503 here rather than an unhandled
  // rejection.
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
      // An access-store failure leaves the connection counts unknown. Zero
      // would read as a learner with nothing connected (Bucket critic C25).
      // The nulls carry that: internalizationState renders "connections
      // unavailable" off `held === null` and internalizationDetail
      // renders "bridges unavailable" off `bridges === null`, so the
      // learner is told the read did not finish.
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
  return NextResponse.json(payload, NO_STORE);
}
