import { authorizeNodes } from "@/lib/research-os/read-access";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createNodeFromProduction } from "@/lib/research-os/production-node";
import { onTeacherReview, onProductionReview, onProductionReturned } from "@/lib/research-os/stages";
import type { Stage } from "@/lib/research-os/types";
import { awardProgress, configured, graphService, recordEvidence, emitProductionOutboxIfAccepted, findNodeById, inChunks} from "@/lib/research-os/db";
import { evidenceErrorResponse } from "@/lib/research-os/evidence-errors";
import { verifyClassTeacher, type ClassTeacher } from "@/lib/research-os/reviewer";
import {
  hasUnverifiedSource,
  isSourceProvenanceStale,
  unverifiedSourceReturnNote,
  computeIncentiveEligible,
  type SourceCheck,
  type DuplicateFlag,
  type LateralReadingFlag,
} from "@/lib/research-os/production-guard";
import { lookupCanonSignoff } from "@/lib/research-os/canon-link";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_SOURCE_NOTE =
  "Returned: this production's sources were never checked against a Quote call (submitted before the provenance guard shipped). " +
  "Resubmit through the workspace so each source can be verified, then it can be reviewed again.";

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
  related_node_id?: string | null;
  kind?: string | null;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  transfer_proof: Record<string, unknown>;
  status: string;
  created_at: string;
  notes: unknown[];
  source_provenance: SourceCheck[] | null;
  duplicate_flag: DuplicateFlag | null;
  counter_evidence: unknown[] | null;
  counter_evidence_required: boolean | null;
  lateral_reading_flag: LateralReadingFlag;
}

function sourceLinesOf(sources: unknown[] | null | undefined): string[] {
  return ((sources ?? []) as unknown[]).map((s) => String(s));
}

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyClassTeacher(req);
  if (!reviewer) return bad(403, "forbidden");

  const svc = graphService();

  const scope = await reviewerScope(reviewer);
  if (!scope.ok) return bad(500, "read_failed");
  const scopedLearners = scope.learners;
  if (scopedLearners && scopedLearners.length === 0) {
    return NextResponse.json({ transferHolds: [], productions: [] }, { headers: { "cache-control": "no-store" } });
  }

  const stateRead = await inLearnerChunks<StateRow>(scopedLearners, (chunk, from, to) => {
    let q = svc.from("learner_node_state").select("learner_id,node_id,stage,evidence,updated_at").eq("stage", "understanding");
    if (chunk) q = q.in("learner_id", chunk);
    return q
      .order("learner_id", { ascending: true })
      .order("node_id", { ascending: true })
      .range(from, to) as unknown as Promise<{ data: StateRow[] | null; error: { message: string } | null }>;
  });
  if (!stateRead.ok) return bad(500, "read_failed");
  const stateRows = stateRead.rows;

  const held = (stateRows || []).filter((r) => {
    const ev = r.evidence || [];
    const last = ev[ev.length - 1];
    return last && last.kind === "transfer_item" && last.held === true;
  });

  const productionRead = await inLearnerChunks<ProductionRow>(scopedLearners, (chunk, from, to) => {
    let q = svc
      .from("productions")
      .select(
        "id,learner_id,target_node_id,related_node_id,kind,claim,evidence,sources,transfer_proof,status,created_at,notes,source_provenance,duplicate_flag,counter_evidence,counter_evidence_required,lateral_reading_flag",
      )
      .eq("status", "submitted");
    if (chunk) q = q.in("learner_id", chunk);
    return q
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to) as unknown as Promise<{ data: ProductionRow[] | null; error: { message: string } | null }>;
  });
  if (!productionRead.ok) return bad(500, "read_failed");
  const productionRows = productionRead.rows.sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)));

  const nodeIds = Array.from(
    new Set([...held.map((r) => r.node_id), ...((productionRows as ProductionRow[]) || []).map((r) => r.target_node_id)]),
  );
  let titleById = new Map<string, string>();
  if (nodeIds.length) {
    const readable = await authorizeNodes(nodeIds, { id: reviewer.id }, "view");
    if (!readable.ok) return bad(503, "access_unavailable");
    if (readable.allowed.length) {
      let nodes: { id: string; title: string }[];
      try {
        nodes = await inChunks<{ id: string; title: string }>(readable.allowed, (chunk, page) =>
          svc.from("nodes").select("id,title").in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; title: string }[] | null; error: { message: string } | null }>,
        );
      } catch (err) {
        console.error("[research-os/review] title read failed:", err instanceof Error ? err.message : err);
        return bad(503, "access_unavailable");
      }
      titleById = new Map(nodes.map((n) => [n.id, n.title]));
    }
  }

  return NextResponse.json(
    {
      transferHolds: held.map((r) => {
        const ev = r.evidence || [];
        const last = ev[ev.length - 1];
        return {
          learnerId: r.learner_id,
          nodeId: r.node_id,
          nodeTitle: titleById.get(r.node_id) ?? r.node_id,
          stage: r.stage,
          heldAt: (last?.at as string | undefined) ?? r.updated_at,
        };
      }),
      productions: ((productionRows as ProductionRow[]) || []).map((p) => {
        const sourceProvenance = p.source_provenance ?? [];
        const counterEvidence = p.counter_evidence ?? [];
        const counterEvidenceRequired = p.counter_evidence_required ?? false;
        const stale = isSourceProvenanceStale(sourceLinesOf(p.sources), sourceProvenance);
        return {
          id: p.id,
          learnerId: p.learner_id,
          targetNodeId: p.target_node_id,
          relatedNodeId: p.related_node_id ?? null,
          kind: p.kind ?? "production",
          targetTitle: titleById.get(p.target_node_id) ?? p.target_node_id,
          claim: p.claim,
          evidence: p.evidence,
          sources: p.sources,
          transferProof: p.transfer_proof,
          createdAt: p.created_at,
          notes: p.notes ?? [],
          sourceProvenance,
          duplicateFlag: p.duplicate_flag ?? null,
          lateralReadingFlag: p.lateral_reading_flag ?? null,
          counterEvidence,
          counterEvidenceRequired,
          guardFlags: {
            hasUnverifiedSource: stale || hasUnverifiedSource(sourceProvenance),
            unverifiedCount: stale ? sourceLinesOf(p.sources).length : sourceProvenance.filter((s) => !s.verified).length,
            sourceProvenanceStale: stale,
            missingCounterEvidence: counterEvidenceRequired && counterEvidence.length === 0,
          },
          unverifiedSourceNoteTemplate: stale ? STALE_SOURCE_NOTE : unverifiedSourceReturnNote(sourceProvenance),
        };
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
});

async function reviewerScope(reviewer: ClassTeacher): Promise<{ ok: true; learners: string[] | null } | { ok: false }> {
  if (reviewer.staff) return { ok: true, learners: null };
  const svc = graphService();

  const classIds: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc
      .from("class_members")
      .select("class_id")
      .eq("learner_id", reviewer.id)
      .in("role", ["teacher", "librarian"])
      .order("class_id", { ascending: true })
      .range(from, from + 999);
    if (error) return { ok: false };
    const rows = (data as { class_id: string }[]) || [];
    classIds.push(...rows.map((r) => r.class_id));
    if (rows.length < 1000) break;
  }
  if (classIds.length === 0) return { ok: true, learners: [] };

  const learners = new Set<string>();
  for (const part of chunkIds(classIds)) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc
        .from("class_members")
        .select("learner_id")
        .in("class_id", part)
        .order("class_id", { ascending: true })
        .order("learner_id", { ascending: true })
        .range(from, from + 999);
      if (error) return { ok: false };
      const rows = (data as { learner_id: string }[]) || [];
      rows.forEach((r) => learners.add(r.learner_id));
      if (rows.length < 1000) break;
    }
  }
  return { ok: true, learners: Array.from(learners) };
}

function chunkIds(ids: string[], size = 100): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

const PAGE = 1000;
const MAX_PAGES = 200;

async function inLearnerChunks<T>(
  learners: string[] | null,
  read: (chunk: string[] | null, from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ ok: true; rows: T[] } | { ok: false }> {
  const rows: T[] = [];
  for (const part of learners ? chunkIds(learners) : [null]) {
    for (let p = 0; ; p += 1) {
      if (p >= MAX_PAGES) return { ok: false };
      const { data, error } = await read(part, p * PAGE, p * PAGE + PAGE - 1);
      if (error) return { ok: false };
      const page = (data as T[]) || [];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
  }
  return { ok: true, rows };
}

interface ReviewBody {
  kind?: "transfer_item" | "production";
  learnerId?: string;
  nodeId?: string;
  productionId?: string;
  decision?: "approved" | "returned";
  reason?: string;
}

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyClassTeacher(req);
  if (!reviewer) return bad(403, "forbidden");

  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as ReviewBody;

  if (body.kind !== "transfer_item" && body.kind !== "production") return bad(400, "kind must be transfer_item or production");
  if (body.decision !== "approved" && body.decision !== "returned") return bad(400, "decision must be approved or returned");
  const reason = (body.reason || "").trim() || undefined;
  if (body.decision === "returned" && !reason) return bad(400, "a one-line reason is required to return an item");

  const svc = graphService();

  const scope = await reviewerScope(reviewer);
  if (!scope.ok) return bad(500, "read_failed");
  const mayDecideFor = (learner: string): boolean => scope.learners === null || scope.learners.includes(learner);

  if (body.kind === "transfer_item") {
    const learnerId = (body.learnerId || "").trim();
    const nodeId = (body.nodeId || "").trim();
    if (!learnerId || !nodeId) return bad(400, "learnerId and nodeId are required");
    if (!mayDecideFor(learnerId)) return bad(404, "state_not_found");

    const { data: existing, error: readErr } = await svc
      .from("learner_node_state")
      .select("stage")
      .eq("learner_id", learnerId)
      .eq("node_id", nodeId)
      .maybeSingle();
    if (readErr) return bad(500, "read_failed");
    if (!existing) return bad(404, "state_not_found");

    const currentStage = existing.stage as Stage;
    const transition = onTeacherReview(currentStage, body.decision, reviewer.id, reason);

    const { error: insErr } = await svc.from("teacher_reviews").insert({
      reviewer_id: reviewer.id,
      learner_id: learnerId,
      kind: "transfer_item",
      node_id: nodeId,
      decision: body.decision,
      reason: reason ?? null,
      evidence: transition.event,
    });
    if (insErr) return bad(500, "review_write_failed");

    if (body.decision === "approved") {
      try {
        await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
      } catch (err) {
        const mapped = evidenceErrorResponse(err);
        if (mapped) return mapped;
        throw err;
      }
    }

    return NextResponse.json({ decision: body.decision, stage: transition.nextStage }, { headers: { "cache-control": "no-store" } });
  }

  const productionId = (body.productionId || "").trim();
  if (productionId && scope.learners !== null) {
    const { data: owner, error: ownerErr } = await svc
      .from("productions")
      .select("learner_id")
      .eq("id", productionId)
      .maybeSingle();
    if (ownerErr) return bad(500, "read_failed");
    if (!owner || !mayDecideFor((owner as { learner_id: string }).learner_id)) return bad(404, "production_not_found");
  }
  if (!productionId) return bad(400, "productionId is required");

  const { data: production, error: prodErr } = await svc
    .from("productions")
    .select("id,learner_id,target_node_id,related_node_id,kind,node_id,claim,evidence,sources,status,created_at,updated_at,notes,source_provenance")
    .eq("id", productionId)
    .maybeSingle();
  if (prodErr) return bad(500, "read_failed");
  if (!production) return bad(404, "production_not_found");
  if (production.status !== "submitted") return bad(409, `production is already "${production.status}", not pending`);

  const sourceProvenance = (production.source_provenance as SourceCheck[] | null) ?? [];
  const stale = isSourceProvenanceStale(sourceLinesOf(production.sources as unknown[] | null), sourceProvenance);
  if (body.decision === "approved" && (stale || hasUnverifiedSource(sourceProvenance))) {
    return NextResponse.json(
      {
        error: "unverified_sources_block_accept",
        message: "This production has a source that could not be matched to a Quote call. Return it instead of approving.",
        noteTemplate: stale ? STALE_SOURCE_NOTE : unverifiedSourceReturnNote(sourceProvenance),
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const newStatus = body.decision === "approved" ? "accepted" : "draft";
  const noteEntry = { at: now, reviewerId: reviewer.id, decision: body.decision, reason: reason ?? null };
  const priorNotes = (production.notes as unknown[] | null) ?? [];
  const notes = [...priorNotes, noteEntry];

  let incentiveEligible = false;
  if (body.decision === "approved") {
    const targetNode = await findNodeById(production.target_node_id as string);
    const paperId = (targetNode?.provenance as { paper_id?: string } | undefined)?.paper_id;
    const signoff = paperId ? lookupCanonSignoff(paperId) : null;
    incentiveEligible = computeIncentiveEligible("accepted", signoff);
  }

  const reviewId = randomUUID();
  const transition =
    body.decision === "approved" ? onProductionReview(reviewer.id, reason, reviewId) : onProductionReturned(reviewer.id, reason, reviewId);
  const { data: reviewed, error: rpcErr } = await svc.rpc("review_production", {
    p_production: productionId,
    p_review_id: reviewId,
    p_reviewer: reviewer.id,
    p_decision: body.decision,
    p_next_status: newStatus,
    p_notes: notes,
    p_incentive: incentiveEligible,
    p_reason: reason ?? null,
    p_note: noteEntry,
    p_learner: production.learner_id as string,
    p_target: production.target_node_id as string,
    p_stage: transition.nextStage,
    p_event: transition.event as unknown as Record<string, unknown>,
  });
  if (rpcErr) {
    const code = (rpcErr as { code?: string }).code ?? null;
    if (code === "55P03" || code === "40001" || code === "40P01") {
      return NextResponse.json(
        { error: "busy" },
        { status: 503, headers: { "cache-control": "no-store", "retry-after": "1" } },
      );
    }
    console.error(`[research-os/review] review_production failed (${code ?? "unknown"}): ${rpcErr.message}`);
    return bad(500, "write_failed");
  }
  const result = (reviewed || {}) as {
    ok?: boolean;
    error?: string;
    status?: string;
    review_id?: string;
    production?: Record<string, unknown>;
    award_from?: string | null;
    awards?: boolean;
  };
  if (!result.ok) {
    if (result.error === "production_not_found") return bad(404, "production_not_found");
    return bad(409, `production is already "${result.status}", not pending`);
  }
  const updated = (result.production ?? null) as Record<string, unknown> | null;

  try {
    await awardProgress(
      production.learner_id as string,
      production.target_node_id as string,
      (result.award_from ?? null) as Stage | null,
      transition.nextStage as Stage,
      { xp: result.awards === true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("update failed")) {
      console.warn(`[research-os/review] award failed for production ${productionId}: ${message}`);
    }
  }

  if (body.decision === "approved" && updated) {
    try {
      await createNodeFromProduction({
        id: production.id as string,
        learner_id: production.learner_id as string,
        target_node_id: production.target_node_id as string,
        related_node_id: (production.related_node_id as string | null) ?? null,
        kind: (production.kind as string | null) ?? "production",
        claim: (production.claim as string | null) ?? null,
        sources: (production.sources as unknown[] | null) ?? [],
        node_id: (production.node_id as string | null) ?? null,
      });
    } catch (err) {
      console.error("[research-os/review] createNodeFromProduction failed:", err instanceof Error ? err.message : err);
    }
  }

  if (body.decision === "approved" && updated) {
    await emitProductionOutboxIfAccepted({
      id: updated.id as string,
      target_node_id: updated.target_node_id as string,
      claim: (updated.claim as string | null) ?? null,
      evidence: (updated.evidence as unknown[]) ?? [],
      sources: (updated.sources as unknown[]) ?? [],
      status: updated.status as string,
      created_at: updated.created_at as string,
      updated_at: updated.updated_at as string | undefined,
    });
  }

  return NextResponse.json(
    { decision: body.decision, status: newStatus, productionIncentiveEligible: incentiveEligible },
    { headers: { "cache-control": "no-store" } },
  );
});
