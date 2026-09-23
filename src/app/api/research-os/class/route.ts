/**
 * /api/research-os/class, the teacher class view (bkt-ros, ros-06 item 2).
 * Everything a reviewer needs to see about the learners they are
 * responsible for, scoped to graph.classes/graph.class_members (migration
 * 20260910030000_research_os_classes.sql) rather than the whole graph the
 * general /research-os/review queue reads.
 *
 * GET ?branch=<slug>&target=<node slug>&staleDays=<n>
 *   -> { classes: [{ id, name, learnerIds, grid, blocked, readyForHarderTarget, calibration }],
 *        queue: { transferHolds: [...], productions: [...] } }
 *   `branch` defaults to "02-physics", `target` to "why-the-sky-is-blue"
 *   (the same defaults GET /api/research-os/route uses), `staleDays`
 *   defaults to 3. `grid`/`blocked`/`readyForHarderTarget` are computed by
 *   src/lib/research-os/class-view.ts's pure functions over the branch's
 *   full subgraph; `queue` is scoped to the union of every learner across
 *   every class this reviewer owns (teacher_reviews carries no class_id,
 *   so a class-by-class queue split is not meaningful yet). `calibration`
 *   (bkt-ros, PLAN-REVISION-2.md section 2a) is per learner, mean
 *   confidence against mean source-prediction correctness over every
 *   forcing-gated "check" event on any node, computed by
 *   src/lib/research-os/calibration.ts's computeCalibrationSummary; a
 *   learner with no forcing-gated Check attempts yet is absent from the
 *   array; a zeroed row never appears.
 *
 * Data loading happens entirely here, server-side: the client page never
 * queries graph.* directly, only this route's already-computed,
 * already-scoped JSON (no raw per-learner rows cross the wire beyond what
 * the grid needs). "No client exposure of other learners' data beyond the
 * reviewer's own classes" is enforced twice: RLS on graph.classes/
 * graph.class_members (defense in depth, the service-role client below
 * bypasses it) and, the real gate today, db.ts's loadClassesForReviewer
 * filtering on the caller's own verified email, never a client-supplied
 * one.
 *
 * Auth: Authorization: Bearer <supabase access token>, verified against
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist,
 * the same gate /api/research-os/review uses.
 * 403 not a reviewer · 404 target not found · 503 not configured.
 */
import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { NextRequest, NextResponse } from "next/server";
import { seedPathOrder, buildClassGrid, findBlockedLearners, findReadyForHarderTarget } from "@/lib/research-os/class-view";
import { configured, graphService, inChunks, loadSubgraph, loadClassesForReviewer, loadClassMembers, loadLearnerStatesForMany, loadXpForLearners } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { computeCalibrationSummary, type CalibrationEvidenceEntry } from "@/lib/research-os/calibration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface StateRow {
  learner_id: string;
  node_id: string;
  stage: string;
  evidence: Array<Record<string, unknown>> | null;
  updated_at: string;
}
interface ProductionRow {
  id: string;
  learner_id: string;
  target_node_id: string;
  claim: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  const { searchParams } = new URL(req.url);
  const branch = (searchParams.get("branch") || "02-physics").trim();
  const targetSlug = (searchParams.get("target") || "why-the-sky-is-blue").trim();
  const staleDays = Number(searchParams.get("staleDays") || "3");
  const staleDaysThreshold = Number.isFinite(staleDays) && staleDays > 0 ? staleDays : 3;

  const classes = await loadClassesForReviewer(reviewer.email);
  const classIds = classes.map((c) => c.id);
  const membersByClass = await loadClassMembers(classIds);
  const allLearnerIds = Array.from(new Set(Array.from(membersByClass.values()).flat()));

  if (classes.length === 0) {
    return NextResponse.json({ classes: [], queue: { transferHolds: [], productions: [] } }, { headers: { "cache-control": "no-store" } });
  }

  let nodes, edges;
  try {
    ({ nodes, edges } = await loadSubgraph(branch));
  } catch {
    return bad(500, "graph_load_failed");
  }
  // This route emits node titles in `blocked`, `readyForHarderTarget`,
  // `transferHolds` and each production's `targetTitle`, and it was the
  // one reading route that took the branch unfiltered. Being staff in a
  // class is not a grant on every node in it.
  const visible = await filterSubgraphForViewer(nodes, edges, reviewer.id);
  if (!visible.ok) return bad(503, "access_unavailable");
  ({ nodes, edges } = visible);
  const target = nodes.find((n) => n.slug === targetSlug);
  if (!target) return bad(404, "target_not_found");

  const path = seedPathOrder(nodes, edges, target.id);
  const statesByLearner = await loadLearnerStatesForMany(allLearnerIds, nodes.map((n) => n.id));
  const now = new Date();

  // Queue and calibration both read graph.learner_node_state directly
  // (loadLearnerStatesForMany's own LearnerNodeState type carries no
  // evidence array, class-view.ts's grid/blocked/ready computations never
  // needed one), so the service client is created here rather than below.
  const svc = graphService();

  // Calibration summary (bkt-ros, PLAN-REVISION-2.md section 2a's
  // calibration record): every learner_node_state row across every node,
  // for every learner across every class this reviewer owns, evidence
  // arrays merged per learner and handed to calibration.ts's pure
  // computeCalibrationSummary. Read failure fails open to an empty
  // summary (a class view with no calibration section is a smaller
  // regression than a broken class view).
  let calibrationRows: ReturnType<typeof computeCalibrationSummary> = [];
  if (allLearnerIds.length > 0) {
    // One try over the three roster reads. Each carried its own .catch
    // returning an empty list, so a failed read showed a teacher a class
    // where nobody had opened anything, at 200.
    try {
    // One row per node each learner has opened, so a class of two
    // hundred at twenty nodes each is four thousand rows. The id list is
    // bounded by the roster and the row count is not.
    const evidenceRows = await inChunks<{ learner_id: string; evidence: CalibrationEvidenceEntry[] | null }>(allLearnerIds, (chunk, page) =>
      svc
        .from("learner_node_state")
        .select("learner_id,evidence")
        .in("learner_id", chunk)
        .order("learner_id")
        .order("node_id")
        .range(page.from, page.to) as unknown as Promise<{ data: { learner_id: string; evidence: CalibrationEvidenceEntry[] | null }[] | null; error: { message: string } | null }>,
    );
    const evidenceByLearner = new Map<string, CalibrationEvidenceEntry[]>();
    for (const r of evidenceRows) {
      const existing = evidenceByLearner.get(r.learner_id) ?? [];
      evidenceByLearner.set(r.learner_id, existing.concat(r.evidence || []));
    }
    calibrationRows = computeCalibrationSummary(evidenceByLearner);
    } catch (err) {
      console.error("[research-os/class] calibration read failed:", err instanceof Error ? err.message : err);
      return bad(503, "class_read_failed");
    }
  }

  // ros-33: XP per learner for the class leaderboard (class only, never global).
  const xpByLearner = await loadXpForLearners(Array.from(new Set(Array.from(membersByClass.values()).flat())));
  const classViews = classes.map((c) => {
    const learnerIds = membersByClass.get(c.id) ?? [];
    const learnerIdSet = new Set(learnerIds);
    return {
      id: c.id,
      name: c.name,
      learnerIds,
      xpByLearner: Object.fromEntries(learnerIds.map((id) => [id, xpByLearner.get(id) ?? 0])),
      grid: buildClassGrid(path, learnerIds, statesByLearner),
      blocked: findBlockedLearners(nodes, edges, target.id, learnerIds, statesByLearner, now, staleDaysThreshold),
      readyForHarderTarget: findReadyForHarderTarget(nodes, edges, learnerIds, statesByLearner),
      calibration: calibrationRows.filter((r) => learnerIdSet.has(r.learnerId)),
    };
  });

  // Queue: the same two "pending" reads /api/research-os/review's own GET
  // performs, scoped to the union of this reviewer's own classes' learners.
  let transferHolds: ReturnType<typeof buildTransferHolds> = [];
  let productions: Array<Record<string, unknown>> = [];
  if (allLearnerIds.length > 0) {
    // Same reason as the calibration read above: each of these carried a
    // .catch returning an empty list.
    try {
    const stateRows = await inChunks<StateRow>(allLearnerIds, (chunk, page) =>
      svc
        .from("learner_node_state")
        .select("learner_id,node_id,stage,evidence,updated_at")
        .eq("stage", "understanding")
        .in("learner_id", chunk)
        .order("learner_id")
        .order("node_id")
        .range(page.from, page.to) as unknown as Promise<{ data: StateRow[] | null; error: { message: string } | null }>,
    );
    const held = stateRows.filter((r) => {
      const ev = r.evidence || [];
      const last = ev[ev.length - 1];
      return last && last.kind === "transfer_item" && last.held === true;
    });
    transferHolds = buildTransferHolds(held, nodes);

    // The learner is the list here, so nothing pins the row count: a
    // class can hold many submitted productions per learner.
    const productionRows = await inChunks<ProductionRow>(allLearnerIds, (chunk, page) =>
      svc
        .from("productions")
        .select("id,learner_id,target_node_id,claim,created_at")
        .eq("status", "submitted")
        .in("learner_id", chunk)
        .order("created_at", { ascending: true })
        .order("id")
        .range(page.from, page.to) as unknown as Promise<{ data: ProductionRow[] | null; error: { message: string } | null }>,
    );
    const titleById = new Map(nodes.map((n) => [n.id, n.title]));
    productions = productionRows.map((p) => ({
      id: p.id,
      learnerId: p.learner_id,
      targetNodeId: p.target_node_id,
      targetTitle: titleById.get(p.target_node_id) ?? p.target_node_id,
      claim: p.claim,
      createdAt: p.created_at,
    }));
    } catch (err) {
      console.error("[research-os/class] roster read failed:", err instanceof Error ? err.message : err);
      return bad(503, "class_read_failed");
    }
  }

  return NextResponse.json(
    { classes: classViews, queue: { transferHolds, productions } },
    { headers: { "cache-control": "no-store" } },
  );
}

function buildTransferHolds(held: StateRow[], nodes: Array<{ id: string; title: string }>) {
  const titleById = new Map(nodes.map((n) => [n.id, n.title]));
  return held.map((r) => {
    const ev = r.evidence || [];
    const last = ev[ev.length - 1];
    return {
      learnerId: r.learner_id,
      nodeId: r.node_id,
      nodeTitle: titleById.get(r.node_id) ?? r.node_id,
      stage: r.stage,
      heldAt: (last?.at as string | undefined) ?? r.updated_at,
    };
  });
}
