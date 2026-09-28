import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { NextResponse } from "next/server";
import { seedPathOrder, buildClassGrid, findBlockedLearners, findReadyForHarderTarget } from "@/lib/research-os/class-view";
import { graphService, inChunks, loadSubgraph, loadClassesForReviewer, loadClassMembers, loadLearnerStatesForMany, loadXpForLearners } from "@/lib/research-os/db";
import { verifyClassTeacher } from "@/lib/research-os/reviewer";
import { computeCalibrationSummary, type CalibrationEvidenceEntry } from "@/lib/research-os/calibration";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyClassTeacher(req);
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
  const visible = await filterSubgraphForViewer(nodes, edges, reviewer.id);
  if (!visible.ok) return bad(503, "access_unavailable");
  ({ nodes, edges } = visible);
  const target = nodes.find((n) => n.slug === targetSlug);
  if (!target) return bad(404, "target_not_found");

  const path = seedPathOrder(nodes, edges, target.id);
  const statesByLearner = await loadLearnerStatesForMany(allLearnerIds, nodes.map((n) => n.id));
  const now = new Date();

  const svc = graphService();

  let calibrationRows: ReturnType<typeof computeCalibrationSummary> = [];
  if (allLearnerIds.length > 0) {
    try {
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

  let transferHolds: ReturnType<typeof buildTransferHolds> = [];
  let productions: Array<Record<string, unknown>> = [];
  if (allLearnerIds.length > 0) {
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
});

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
