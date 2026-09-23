import { NextResponse } from "next/server";
import { onProductionSubmitted } from "@/lib/research-os/stages";
import { PRODUCTION_KINDS, type ProductionKind } from "@/lib/research-os/production-node";
import {
  configured,
  graphService,
  verifyLearner,
  recordEvidence,
  emitProductionOutboxIfAccepted,
  loadCurrentStage,
  loadLearnerQuoteEvidence,
  loadOwnPriorClaims,
  loadClassPeerAcceptedClaims,
  loadLearnerCorroborationEvidence,
} from "@/lib/research-os/db";
import { evidenceErrorResponse } from "@/lib/research-os/evidence-errors";
import { authorizeNodes } from "@/lib/research-os/read-access";
import {
  checkSourceProvenance,
  computeDuplicateFlag,
  requiresCounterEvidence,
  hasCounterEvidence,
  normalizeCounterEvidence,
  lateralReadingFlag,
  type DuplicateCandidate,
} from "@/lib/research-os/production-guard";
import { canonClaimsAsDuplicateCandidates } from "@/lib/research-os/canon-link";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  const { searchParams } = new URL(req.url);
  const targetNodeId = searchParams.get("targetNodeId");

  const svc = graphService();
  let q = svc.from("productions").select("*").eq("learner_id", learnerId).order("created_at", { ascending: false });
  if (targetNodeId) q = q.eq("target_node_id", targetNodeId);
  const { data, error } = await q;
  if (error) return bad(500, "read_failed");
  const rows = (data || []) as { target_node_id: string; related_node_id?: string | null; node_id?: string | null }[];
  const ids = Array.from(new Set(rows.flatMap((r) => [r.target_node_id, r.related_node_id ?? null, r.node_id ?? null]).filter((x): x is string => Boolean(x))));
  const titles: Record<string, { slug: string; title: string; kind: string }> = {};
  if (ids.length) {
    const readable = await authorizeNodes(ids, { id: learnerId }, "view");
    if (!readable.ok) return bad(503, "access_unavailable");
    if (readable.allowed.length) {
      const { data: nodes } = await svc.from("nodes").select("id,slug,title,kind").in("id", readable.allowed);
      for (const nd of (nodes || []) as { id: string; slug: string; title: string; kind: string }[]) titles[nd.id] = { slug: nd.slug, title: nd.title, kind: nd.kind };
    }
  }
  return NextResponse.json({ productions: data || [], nodes: titles }, { headers: { "cache-control": "no-store" } });
});

interface ProductionBody {
  id?: string;
  targetNodeId?: string;
  kind?: string;
  relatedNodeId?: string | null;
  claim?: string;
  evidence?: unknown[];
  sources?: unknown[];
  transferProof?: Record<string, unknown>;
  counterEvidence?: unknown[];
  status?: "draft" | "submitted";
  sessionId?: string;
}

export const POST = withResearchOsRoute({ auth: "required", consent: "production_submit" }, async (req, { learnerId }) => {
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as ProductionBody;
  const namedNodes = [body.targetNodeId, body.relatedNodeId].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (namedNodes.length) {
    const readable = await authorizeNodes(namedNodes, { id: learnerId }, "view");
    if (!readable.ok) return bad(503, "access_unavailable");
    if (readable.allowed.length < namedNodes.length) return bad(404, "node_not_found");
  }
  if (!body.id && !body.targetNodeId) return bad(400, "targetNodeId is required for a new production");
  if (body.status && body.status !== "draft" && body.status !== "submitted") {
    return bad(400, 'status must be "draft" or "submitted" (accept/return require a teacher, Phase 1)');
  }

  const svc = graphService();

  let existingTargetNodeId: string | undefined;
  if (body.id) {
    const { data: owned, error: ownErr } = await svc
      .from("productions")
      .select("learner_id,target_node_id")
      .eq("id", body.id)
      .maybeSingle();
    if (ownErr) return bad(500, "read_failed");
    if (!owned) return bad(404, "production_not_found");
    if (owned.learner_id !== learnerId) return bad(403, "forbidden");
    existingTargetNodeId = owned.target_node_id as string;
  }
  const targetNodeId = body.targetNodeId || existingTargetNodeId;

  let sourceProvenance: ReturnType<typeof checkSourceProvenance> | undefined;
  let duplicateFlag: ReturnType<typeof computeDuplicateFlag> | undefined;
  let lateralFlag: ReturnType<typeof lateralReadingFlag> | undefined;
  let counterEvidenceRequired = false;
  let submitFromStage: Awaited<ReturnType<typeof loadCurrentStage>> | undefined;
  if (body.status === "submitted") {
    if (!targetNodeId) return bad(400, "targetNodeId is required to submit a production");
    submitFromStage = await loadCurrentStage(learnerId, targetNodeId);
    if (submitFromStage === null) return bad(503, "stage_read_failed");
    counterEvidenceRequired = requiresCounterEvidence(submitFromStage);
    if (counterEvidenceRequired && !hasCounterEvidence(body.counterEvidence)) {
      return bad(400, "counter_evidence is required to submit an internalization-tier production (Osborne 2010)");
    }

    const claimText = (body.claim || "").trim();
    const sourceLines = ((body.sources ?? []) as unknown[]).map((s) => String(s));
    const [quoteEvidence, ownPrior, classPeers, corroborationEvidence] = await Promise.all([
      loadLearnerQuoteEvidence(learnerId),
      loadOwnPriorClaims(learnerId, body.id),
      loadClassPeerAcceptedClaims(learnerId),
      loadLearnerCorroborationEvidence(learnerId),
    ]);
    sourceProvenance = checkSourceProvenance(sourceLines, quoteEvidence);
    const candidates: DuplicateCandidate[] = [
      ...ownPrior.map((r) => ({ id: r.id, text: r.claim, origin: "own_prior" as const })),
      ...classPeers.map((r) => ({ id: r.id, text: r.claim, origin: "class_peer" as const })),
      ...canonClaimsAsDuplicateCandidates(),
    ];
    duplicateFlag = computeDuplicateFlag(claimText, candidates);
    lateralFlag = lateralReadingFlag(targetNodeId, corroborationEvidence);
  }

  const row: Record<string, unknown> = {
    learner_id: learnerId,
    claim: body.claim ?? null,
    evidence: body.evidence ?? [],
    sources: body.sources ?? [],
    transfer_proof: body.transferProof ?? {},
    counter_evidence: normalizeCounterEvidence(body.counterEvidence),
    status: body.status ?? "draft",
    updated_at: new Date().toISOString(),
  };
  if (body.id) row.id = body.id;


  if (body.targetNodeId) row.target_node_id = body.targetNodeId;
  if (typeof body.kind === "string" && PRODUCTION_KINDS.includes(body.kind as ProductionKind)) row.kind = body.kind;
  if (body.relatedNodeId !== undefined) row.related_node_id = body.relatedNodeId;
  if (sourceProvenance !== undefined) row.source_provenance = sourceProvenance;
  if (duplicateFlag !== undefined) row.duplicate_flag = duplicateFlag;
  if (lateralFlag !== undefined) row.lateral_reading_flag = lateralFlag;
  if (body.status === "submitted") row.counter_evidence_required = counterEvidenceRequired;

  const { data, error } = await svc.from("productions").upsert(row, { onConflict: "id" }).select("*").maybeSingle();
  if (error) return bad(500, "write_failed");

  if (body.status === "submitted" && data?.target_node_id) {
    const transition = onProductionSubmitted(submitFromStage ?? "access", { sessionId: (body.sessionId || "").trim() || undefined });
    try {
      await recordEvidence(learnerId, data.target_node_id as string, transition.nextStage, transition.event as unknown as Record<string, unknown>);
    } catch (err) {
      const mapped = evidenceErrorResponse(err);
      if (mapped) return mapped;
      throw err;
    }
  }

  if (data) {
    await emitProductionOutboxIfAccepted({
      id: data.id as string,
      target_node_id: data.target_node_id as string,
      claim: (data.claim as string | null) ?? null,
      evidence: (data.evidence as unknown[]) ?? [],
      sources: (data.sources as unknown[]) ?? [],
      status: data.status as string,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string | undefined,
    });
  }

  return NextResponse.json({ production: data }, { headers: { "cache-control": "no-store" } });
});
