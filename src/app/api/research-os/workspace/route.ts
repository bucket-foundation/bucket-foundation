import { NextResponse } from "next/server";
import { evidenceErrorResponse } from "@/lib/research-os/evidence-errors";
import { callGroundedModelWithUsage, logToolCost, parseModelJson, selectProvider } from "@/lib/research-os/llm";
import { gradeExplanation, citationLabel } from "@/lib/research-os/grounding";
import { deterministicCheck, deterministicOrganize, llmEnabled } from "@/lib/research-os/deterministic";
import { onCheckResult, onQuoteReturned, onCorroborationRecorded } from "@/lib/research-os/stages";
import { locateHits, findIndependentSources, assessSourceIndependence } from "@/lib/research-os/locate";
import { groundOrganizeResult, type OrganizeModelOutput } from "@/lib/research-os/organize";
import { dailyToolCap, recordAndCheck, dailyCapMessage } from "@/lib/research-os/rate-limit";
import { computeFrontier } from "@/lib/research-os/frontier";
import { guidanceLevel as computeGuidanceLevelForLearner } from "@/lib/research-os/guidance";
import type { GuidanceLevel, Stage } from "@/lib/research-os/types";
import {
  configured,
  graphService,
  verifyLearner,
  recordEvidence,
  loadCurrentStage,
  loadForcingEnabledForLearner,
  loadSecondSourceRequiredForLearner,
  loadLearnerQuoteEvidence,
  loadSubgraph,
  loadLearnerStates,
  isGuidanceEnabledForLearner,
} from "@/lib/research-os/db";
import { authorizeNode, authorizeNodes, readVisibility, storeWithNodes } from "@/lib/research-os/read-access";
import { curatedQuotePayload } from "@/lib/research-os/quote-receipt";
import type { NodeAccess } from "@/lib/research-os/access";
import { getPassage } from "@/lib/research-os/passages";
import type { Provenance } from "@/lib/research-os/types";
import { resolveForcingEnabled, finalizeReveal } from "@/lib/research-os/forcing";
import { dbStorePendingAttempt, dbRevealPendingAttempt, dbGetPendingAttempt, dbConsumePendingAttempt } from "@/lib/research-os/check-attempts-db";
import { checkSecondSourceGate, resolveSecondSourceRequired, secondSourceRequiredAtStage } from "@/lib/research-os/lateral-reading";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ORGANIZE_TOKENS = 500;
const MAX_EXPLANATION_CHARS = 2000;
const MAX_SESSION_ID_CHARS = 200;

const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const rlBuckets = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (rlBuckets.get(key) || []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  rlBuckets.set(key, hits);
  return hits.length > RL_MAX;
}

function logToolCall(tool: string, learnerId: string, sessionId: string | undefined, extra: Record<string, unknown> = {}): void {
  try {
    console.log("[research-os/tool-call]", JSON.stringify({ tool, learnerId, sessionId: sessionId ?? null, at: new Date().toISOString(), ...extra }));
  } catch {
  }
}

function sessionIdOf(body: { sessionId?: string }): string | undefined {
  const s = (body.sessionId || "").trim();
  if (!s) return undefined;
  return s.slice(0, MAX_SESSION_ID_CHARS);
}

async function computeGuidanceForNode(learnerId: string, nodeId: string, branch: string): Promise<GuidanceLevel> {
  let guidance: GuidanceLevel = "medium";
  try {
    const { nodes: branchNodes, edges: branchEdges } = await loadSubgraph(branch);
    const branchStates = await loadLearnerStates(learnerId, branchNodes.map((n) => n.id));
    const { chain } = computeFrontier(branchNodes, branchEdges, branchStates, nodeId);
    guidance = await computeGuidanceLevelForLearner(learnerId, chain);
  } catch {
    guidance = "medium";
  }
  if (!(await isGuidanceEnabledForLearner(learnerId))) guidance = "low";
  return guidance;
}

interface WorkspaceBody {
  action?: "locate" | "quote" | "check" | "organize";
  sessionId?: string;
  query?: string;
  branch?: string;
  nodeId?: string;
  explanation?: string;
  claim?: string;
  evidenceNotes?: string;
  sourceNotes?: string;
  attemptId?: string;
  learnerConfidence?: string;
  sourcePrediction?: string;
  mode?: "hits" | "secondSource";
  quotedSourceNodeId?: string;
  secondSourceNodeId?: string;
  passagesAgree?: boolean;
  verdict?: "support" | "contradiction";
  quotes?: { quotable_span: string | null; citation: string }[];
}

type LocateRow = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  summary: string | null;
  provenance: unknown;
  visibility: string | null;
  owner_id: string | null;
};

async function readableRows(rows: LocateRow[], learnerId: string): Promise<{ ok: true; rows: LocateRow[] } | { ok: false }> {
  const access: NodeAccess[] = rows.map((r) => ({
    id: r.id,
    visibility: readVisibility(r.visibility),
    ownerId: r.owner_id ?? null,
  }));
  const decision = await authorizeNodes(rows.map((r) => r.id), { id: learnerId }, "view", storeWithNodes(access));
  if (!decision.ok) return { ok: false };
  const visible = new Set(decision.allowed);
  return { ok: true, rows: rows.filter((r) => visible.has(r.id)) };
}

export const POST = withResearchOsRoute({ auth: "required", consent: "workspace_tool" }, async (req, { learnerId }) => {
  if (rateLimited(learnerId)) return bad(429, "Too many workspace requests. Slow down a moment.");

  const cap = dailyToolCap();
  if (!recordAndCheck(learnerId, cap).allowed) return bad(429, dailyCapMessage(cap));

  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as WorkspaceBody;
  const sessionId = sessionIdOf(body);

  const svc = graphService();

  switch (body.action) {
    case "locate": {
      const query = (body.query || "").trim();
      if (!query) return bad(400, "query is required");

      if (body.mode === "secondSource") {
        const quotedSourceNodeId = (body.quotedSourceNodeId || "").trim();
        if (!quotedSourceNodeId) return bad(400, "quotedSourceNodeId is required for secondSource mode");
        const reference = await authorizeNode(quotedSourceNodeId, { id: learnerId }, "view");
        if (!reference.ok) {
          if (reference.reason === "unavailable") return bad(503, "access_unavailable");
          return bad(404, "node_not_found");
        }
        const { data: quotedNode, error: quotedErr } = await svc.from("nodes").select("id,provenance").eq("id", quotedSourceNodeId).maybeSingle();
        if (quotedErr || !quotedNode) return bad(404, "node_not_found");
        const { data, error } = await svc.from("nodes").select("id,slug,title,kind,tier,summary,provenance,visibility,owner_id");
        if (error) return bad(500, "locate_failed");
        const readable = await readableRows((data || []) as LocateRow[], learnerId);
        if (!readable.ok) return bad(503, "access_unavailable");
        const candidates = findIndependentSources(readable.rows as Parameters<typeof findIndependentSources>[0], query, {
          id: quotedNode.id as string,
          provenance: (quotedNode.provenance || undefined) as Provenance | undefined,
        });
        logToolCall("locate", learnerId, sessionId, { mode: "secondSource", quotedSourceNodeId, resultCount: candidates.length });
        return NextResponse.json({ results: candidates }, { headers: { "cache-control": "no-store" } });
      }

      const branch = body.branch || "02-physics";
      const { data, error } = await svc
        .from("nodes")
        .select("id,slug,title,kind,tier,summary,provenance,visibility,owner_id")
        .eq("branch", branch);
      if (error) return bad(500, "locate_failed");
      const readableHits = await readableRows((data || []) as LocateRow[], learnerId);
      if (!readableHits.ok) return bad(503, "access_unavailable");
      const hits = locateHits(readableHits.rows as Parameters<typeof locateHits>[0], query);
      logToolCall("locate", learnerId, sessionId, { branch, resultCount: hits.length });
      return NextResponse.json({ results: hits }, { headers: { "cache-control": "no-store" } });
    }

    case "quote": {
      const nodeId = (body.nodeId || "").trim();
      if (!nodeId) return bad(400, "nodeId is required");

      const citable = await authorizeNode(nodeId, { id: learnerId }, "cite");
      if (!citable.ok) {
        if (citable.reason === "unavailable") return bad(503, "access_unavailable");
        return bad(404, "node_not_found");
      }
      const { data: node, error } = await svc
        .from("nodes")
        .select("id,slug,title,summary,provenance")
        .eq("id", nodeId)
        .maybeSingle();
      if (error || !node) return bad(404, "node_not_found");
      const p = (node.provenance || {}) as Provenance;

      const passage = getPassage(node.slug);

      let receipt: { id: string; sourceId: string; sourceRevision: string; createdAt: string; replayed: boolean } | null = null;
      if (passage) {
        const citation = citationLabel({ title: node.title, provenance: p });
        const identity = curatedQuotePayload(
          {
            nodeId: node.id as string,
            slug: node.slug as string,
            title: node.title as string,
            text: passage.text,
            locator: passage.locator,
            citation,
          },
          sessionId || null,
        );
        const currentStage = await loadCurrentStage(learnerId, nodeId);
        if (currentStage === null) {
          return NextResponse.json({ error: "busy" }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "1" } });
        }
        const transition = onQuoteReturned(currentStage, { sessionId, locator: passage.locator });
        const { data: written, error: receiptErr } = await svc.rpc("record_quote_receipt", {
          p_learner: learnerId,
          p_target: nodeId,
          p_source_id: identity.sourceId,
          p_source_revision: identity.sourceRevision,
          p_source_node: identity.sourceNodeId,
          p_passage_id: identity.passageId,
          p_locator: identity.locator,
          p_text_hash: identity.textHash,
          p_session: sessionId || null,
          p_idempotency_key: identity.idempotencyKey,
          p_payload_hash: identity.payloadHash,
          p_stage: transition.nextStage,
          p_event: transition.event as unknown as Record<string, unknown>,
        });
        if (receiptErr) {
          const code = (receiptErr as { code?: string }).code ?? null;
          console.error(`[research-os] quote receipt failed (${code ?? "unknown"}) for learner ${learnerId} node ${nodeId}: ${receiptErr.message}`);
          if (code === "55P03" || code === "40001" || code === "40P01") {
            return NextResponse.json(
              { error: "busy" },
              { status: 503, headers: { "cache-control": "no-store", "retry-after": "1" } },
            );
          }
          return bad(500, "quote_not_recorded");
        }
        const result = (written || {}) as {
          ok?: boolean;
          error?: string;
          receipt_id?: string;
          created_at?: string;
          replayed?: boolean;
        };
        if (!result.ok) {
          if (result.error === "idempotency_conflict") return bad(409, "quote_receipt_conflict");
          if (result.error === "source_gone" || result.error === "target_gone") return bad(404, "node_not_found");
          return bad(403, "source_not_quotable");
        }
        receipt = {
          id: result.receipt_id as string,
          sourceId: identity.sourceId,
          sourceRevision: identity.sourceRevision,
          createdAt: (result.created_at as string) ?? new Date().toISOString(),
          replayed: result.replayed === true,
        };
      }

      logToolCall("quote", learnerId, sessionId, { nodeId, kind: passage ? "quote" : "summary" });
      return NextResponse.json(
        {
          nodeId: node.id,
          kind: passage ? "quote" : "summary",
          quotable_span: passage ? passage.text : node.summary,
          locator: passage ? passage.locator : null,
          citation: citationLabel({ title: node.title, provenance: p }),
          source: { author: p.author, year: p.year, title: p.title, publisher: p.publisher, doi: p.doi, url: passage?.url ?? p.url, license: p.license },
          ...(receipt
            ? {
                receipt: {
                  id: receipt.id,
                  sourceId: receipt.sourceId,
                  sourceRevision: receipt.sourceRevision,
                  createdAt: receipt.createdAt,
                  replayed: receipt.replayed,
                },
                durable: true,
              }
            : { durable: false }),
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    case "check": {
      const nodeId = (body.nodeId || "").trim();
      const attemptId = (body.attemptId || "").trim();

      if (attemptId) {
        const pendingPrecheck = await dbGetPendingAttempt(attemptId, learnerId);
        if (!pendingPrecheck) return bad(404, "check_attempt_not_found");

        const stillContinuable = await authorizeNode(pendingPrecheck.nodeId, { id: learnerId }, "continue");
        if (!stillContinuable.ok) {
          if (stillContinuable.reason === "unavailable") return bad(503, "access_unavailable");
          await dbConsumePendingAttempt(attemptId);
          return bad(404, "node_not_found");
        }

        const forcingPrecheck = finalizeReveal(pendingPrecheck, body.learnerConfidence, body.sourcePrediction || "");
        if (!forcingPrecheck.ok) {
          return bad(400, "A confidence rating and a source prediction are required before feedback is shown.");
        }

        const classSecondSourceOverride = await loadSecondSourceRequiredForLearner(learnerId);
        const secondSourceRequired = resolveSecondSourceRequired(classSecondSourceOverride);
        const secondSourceNodeId = (body.secondSourceNodeId || "").trim();
        let secondSourceWasQuoted = false;
        let secondSourceIndependent = false;
        let independenceReason = "";
        if (secondSourceRequiredAtStage(pendingPrecheck.currentStage, secondSourceRequired) && secondSourceNodeId) {
          const secondReadable = await authorizeNode(secondSourceNodeId, { id: learnerId }, "view");
          if (!secondReadable.ok && secondReadable.reason === "unavailable") return bad(503, "access_unavailable");
          const quoteEvidence = await loadLearnerQuoteEvidence(learnerId);
          secondSourceWasQuoted = secondReadable.ok && quoteEvidence.some((q) => q.nodeId === secondSourceNodeId);
          if (secondSourceWasQuoted) {
            const { data: sourceNodes } = await svc.from("nodes").select("id,provenance").in("id", [pendingPrecheck.nodeId, secondSourceNodeId]);
            const byId = new Map(((sourceNodes || []) as { id: string; provenance: Provenance | null }[]).map((n) => [n.id, n.provenance || undefined]));
            const assessment = assessSourceIndependence(byId.get(pendingPrecheck.nodeId), byId.get(secondSourceNodeId));
            secondSourceIndependent = assessment.independent;
            independenceReason = assessment.reason;
          }
        }

        const secondSourceGate = checkSecondSourceGate({
          required: secondSourceRequired,
          stage: pendingPrecheck.currentStage,
          secondSourceNodeId: secondSourceNodeId || undefined,
          secondSourceWasQuoted,
          secondSourceIndependent,
        });
        if (!secondSourceGate.ok) {
          return bad(400, secondSourceGate.message);
        }

        const reveal = await dbRevealPendingAttempt(attemptId, learnerId, body.learnerConfidence, body.sourcePrediction || "");
        if (!reveal.ok) {
          if (reveal.reason === "not_found") return bad(404, "check_attempt_not_found");
          return bad(400, "A confidence rating and a source prediction are required before feedback is shown.");
        }
        const { attempt: pending, learnerConfidence: learnerConfidenceRaw, sourcePrediction, predictionCorrect } = reveal;

        const { data: pendingNode } = await svc.from("nodes").select("branch").eq("id", pending.nodeId).maybeSingle();
        const revealGuidance = pendingNode ? await computeGuidanceForNode(learnerId, pending.nodeId, pendingNode.branch as string) : "medium";

        const transition = onCheckResult(
          pending.currentStage,
          { result: pending.grade.result, confidence: pending.grade.confidence, abstained: pending.grade.abstained },
          {
            learnerText: pending.explanation,
            modelFeedback: pending.grade.feedback,
            citations: pending.grade.citations,
            sessionId: pending.sessionId,
            learnerConfidence: learnerConfidenceRaw,
            sourcePrediction,
            predictionCorrect,
            forcingEnabled: true,
            secondSourceRequired: secondSourceGate.secondSourceRequired,
            secondSourceNodeId: secondSourceGate.secondSourceRequired ? secondSourceNodeId : undefined,
            guidanceLevel: revealGuidance,
          },
        );
        try {
          await recordEvidence(learnerId, pending.nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
        } catch (err) {
          const mapped = evidenceErrorResponse(err);
          if (mapped) return mapped;
          throw err;
        }

        if (secondSourceGate.secondSourceRequired && secondSourceNodeId) {
          const corroboration = onCorroborationRecorded(transition.nextStage, {
            sessionId: pending.sessionId,
            firstSourceId: pending.nodeId,
            secondSourceId: secondSourceNodeId,
            independenceReason,
            passagesAgree: Boolean(body.passagesAgree),
          });
          try {
            await recordEvidence(learnerId, pending.nodeId, corroboration.nextStage, corroboration.event as unknown as Record<string, unknown>);
          } catch (err) {
            const mapped = evidenceErrorResponse(err);
            if (mapped) return mapped;
            throw err;
          }
        }

        logToolCall("check", learnerId, pending.sessionId, {
          nodeId: pending.nodeId,
          result: pending.grade.result,
          abstained: pending.grade.abstained,
          stage: transition.nextStage,
          forcingEnabled: true,
          predictionCorrect,
          secondSourceRequired: secondSourceGate.secondSourceRequired,
          guidance: revealGuidance,
        });

        return NextResponse.json(
          {
            result: pending.grade.result,
            confidence: pending.grade.confidence,
            abstained: pending.grade.abstained,
            feedback: pending.grade.feedback,
            citations: pending.grade.citations,
            stage: transition.nextStage,
            learnerConfidence: learnerConfidenceRaw,
            sourcePrediction,
            predictionCorrect,
            forcingEnabled: true,
            secondSourceRequired: secondSourceGate.secondSourceRequired,
            guidance: revealGuidance,
          },
          { headers: { "cache-control": "no-store" } },
        );
      }

      const explanation = (body.explanation || "").trim();
      if (!nodeId) return bad(400, "nodeId is required");
      if (!explanation) return bad(400, "explanation is required");
      if (explanation.length > MAX_EXPLANATION_CHARS) return bad(400, "explanation too long");

      const continuable = await authorizeNode(nodeId, { id: learnerId }, "continue");
      if (!continuable.ok) {
        if (continuable.reason === "unavailable") return bad(503, "access_unavailable");
        return bad(404, "node_not_found");
      }

      const { data: node, error: nodeErr } = await svc
        .from("nodes")
        .select("id,slug,branch,title,summary,provenance")
        .eq("id", nodeId)
        .maybeSingle();
      if (nodeErr || !node) return bad(404, "node_not_found");

      const { data: prereqEdges } = await svc.from("edges").select("from_id").eq("to_id", nodeId).eq("kind", "prerequisite");
      const prereqIds = (prereqEdges || []).map((e: { from_id: string }) => e.from_id);
      let prereqSummaries: { title: string; summary: string | null }[] = [];
      if (prereqIds.length) {
        const readablePrereqs = await authorizeNodes(prereqIds, { id: learnerId }, "view");
        if (!readablePrereqs.ok) return bad(503, "access_unavailable");
        if (readablePrereqs.allowed.length) {
          const { data: prereqNodes, error: prereqErr } = await svc.from("nodes").select("title,summary").in("id", readablePrereqs.allowed);
          if (prereqErr) return bad(503, "access_unavailable");
          prereqSummaries = prereqNodes || [];
        }
      }
      if (prereqIds.length > 0 && prereqSummaries.length === 0) {
        return bad(409, "check_grounding_unavailable");
      }

      const guidance = await computeGuidanceForNode(learnerId, nodeId, node.branch);

      let safe: Awaited<ReturnType<typeof gradeExplanation>>;
      if (!llmEnabled()) {
        const quoted = (await loadLearnerQuoteEvidence(learnerId)).some((q) => q.nodeId === nodeId);
        const quotes = quoted && Array.isArray(body.quotes) ? body.quotes.filter((q) => q && typeof q.citation === "string") : [];
        safe = { ...deterministicCheck({ explanation, quotes, verdict: body.verdict }), usage: null };
      } else {
        const provider = selectProvider();
        if (!provider) return bad(503, "Check isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");
        try {
          safe = await gradeExplanation(provider, node, prereqSummaries, explanation, guidance, getPassage(node.slug));
        } catch (e: unknown) {
          const err = e as { status?: number };
          if (err?.status === 401) return bad(503, "Check credentials are invalid on the server.");
          if (err?.status === 429) return bad(429, "Rate limited, try again in a moment.");
          return bad(502, "check_failed");
        }
        logToolCost("check", learnerId, provider, safe.usage);
      }

      const { data: existingState } = await svc
        .from("learner_node_state")
        .select("stage")
        .eq("learner_id", learnerId)
        .eq("node_id", nodeId)
        .maybeSingle();
      const currentStage = ((existingState?.stage as Stage | undefined) ?? "access") as Stage;

      const classForcingOverride = await loadForcingEnabledForLearner(learnerId);
      const forcingEnabled = resolveForcingEnabled(classForcingOverride);

      if (!forcingEnabled) {
        const transition = onCheckResult(
          currentStage,
          { result: safe.result, confidence: safe.confidence, abstained: safe.abstained },
          { learnerText: explanation, modelFeedback: safe.feedback, citations: safe.citations, sessionId, forcingEnabled: false, guidanceLevel: guidance },
        );
        try {
          await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
        } catch (err) {
          const mapped = evidenceErrorResponse(err);
          if (mapped) return mapped;
          throw err;
        }
        logToolCall("check", learnerId, sessionId, { nodeId, result: safe.result, abstained: safe.abstained, stage: transition.nextStage, forcingEnabled: false, guidance });

        return NextResponse.json(
          {
            result: safe.result,
            confidence: safe.confidence,
            abstained: safe.abstained,
            feedback: safe.feedback,
            citations: safe.citations,
            stage: transition.nextStage,
            forcingEnabled: false,
            guidance,
          },
          { headers: { "cache-control": "no-store" } },
        );
      }

      const newAttemptId = await dbStorePendingAttempt({
        learnerId,
        nodeId,
        sessionId,
        explanation,
        allowLabel: citationLabel({ title: node.title, provenance: (node.provenance || undefined) as Provenance | undefined }),
        grade: safe,
        currentStage,
        forcingEnabled: true,
        createdAt: Date.now(),
      });
      logToolCall("check", learnerId, sessionId, { nodeId, forcingEnabled: true, forcingRequired: true, guidance });

      return NextResponse.json({ attemptId: newAttemptId, forcingRequired: true, forcingEnabled: true, guidance }, { headers: { "cache-control": "no-store" } });
    }

    case "organize": {
      const claim = (body.claim || "").trim();
      const evidenceNotes = (body.evidenceNotes || "").trim();
      const sourceNotes = (body.sourceNotes || "").trim();
      if (!claim && !evidenceNotes && !sourceNotes) return bad(400, "at least one field is required");

      if (!llmEnabled()) {
        const safe = deterministicOrganize({ claim, evidenceNotes, sourceNotes });
        logToolCall("organize", learnerId, sessionId, { abstained: false, claimKept: Boolean(safe.claim), evidenceKept: safe.evidence.length, sourcesKept: safe.sources.length, mode: "deterministic" });
        return NextResponse.json(safe, { headers: { "cache-control": "no-store" } });
      }

      const provider = selectProvider();
      if (!provider) return bad(503, "Organize isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

      const system = `You are the Organize tool. You relabel the learner's OWN notes into a claim/evidence/sources scaffold. You NEVER add a fact, number, or claim that is not already present in their notes, you only sort and label what they wrote.

HARD RULES:
1. "claim" is the learner's claim text, copied or lightly trimmed for clarity, never rewritten in substance.
2. "evidence" is an array of the distinct evidence points found in their evidence notes, each copied or lightly trimmed, never invented.
3. "sources" is an array of the distinct sources found in their source notes, each copied or lightly trimmed, never invented.
4. If a field is empty in the input, return an empty result for it and do not fabricate content to fill it.
5. Never generate a new sentence that is not a light trim of something the learner wrote.

Respond with ONLY a JSON object, no markdown fences:
{"claim": string, "evidence": string[], "sources": string[]}`;

      let text: string;
      let usage: Awaited<ReturnType<typeof callGroundedModelWithUsage>>["usage"];
      try {
        const result = await callGroundedModelWithUsage(
          provider,
          system,
          [
            {
              role: "user",
              content: `CLAIM NOTES: ${claim || "(none)"}\n\nEVIDENCE NOTES: ${evidenceNotes || "(none)"}\n\nSOURCE NOTES: ${sourceNotes || "(none)"}`,
            },
          ],
          MAX_ORGANIZE_TOKENS,
        );
        text = result.text;
        usage = result.usage;
      } catch {
        return bad(502, "organize_failed");
      }
      logToolCost("organize", learnerId, provider, usage);

      const parsed = parseModelJson<OrganizeModelOutput>(text);
      const safe = parsed
        ? groundOrganizeResult(parsed, { claim, evidenceNotes, sourceNotes })
        : { claim, evidence: evidenceNotes ? [evidenceNotes] : [], sources: sourceNotes ? [sourceNotes] : [], abstained: false };

      logToolCall("organize", learnerId, sessionId, { abstained: safe.abstained, claimKept: Boolean(safe.claim), evidenceKept: safe.evidence.length, sourcesKept: safe.sources.length });

      return NextResponse.json(safe, { headers: { "cache-control": "no-store" } });
    }

    default:
      return bad(400, "action must be one of locate, quote, check, organize");
  }
});
