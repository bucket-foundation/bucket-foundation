/**
 * POST /api/research-os/workspace, the four AI actions Locate, Quote, Check,
 * Organize (bkt-ros, task item 4), scoped to the Phase 0 seeded subgraph.
 * Reuses /api/academy/tutor's pattern (grounded, citation-validated,
 * abstains, provider seam, fail-safe JSON parsing) rather than a fifth
 * integration: see src/lib/research-os/llm.ts.
 *
 * The AI never writes the learner's claim or synthesis (task item 4's hard
 * requirement). This is enforced two ways, matching the tutor's S7 "verified
 * in code, not just the prompt" floor:
 *   1. A closed action allow-list: only "locate" | "quote" | "check" |
 *      "organize" are accepted; anything else is 400, before any model call.
 *   2. Locate and Quote never call a model at all (retrieval only, per
 *      RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3's workspace table). Check
 *      grades the learner's OWN explanation against grounding, it never
 *      emits a corrected version of it (enforced in code by
 *      grounding.ts's sanitizeGradeResult and GradeResult's own type, which
 *      has no field for a rewritten explanation). Organize only relabels
 *      the learner's OWN input into named slots; organize.ts's
 *      groundOrganizeResult drops any item that is not grounded in the
 *      matching input field, enforced in code as a second, independent
 *      check beside the system prompt's own instruction.
 *
 * ros-04 UPDATE ("workspace hardening"): every action now
 *   - carries an optional client-generated `sessionId`, forwarded onto
 *     every evidence event this call produces (EVIDENCE-SCHEMA.md);
 *   - is logged as one structured tool-call line (logToolCall below).
 *     Locate scans a whole branch and Organize works freeform notes, so
 *     neither has a single `graph.nodes` row of its own to attach a DB
 *     evidence event to; this log line stands in for the
 *     `learner_node_state.evidence` append the other two actions get;
 *     Check (node-scoped, produces a stage transition) and Quote (node-
 *     scoped) both also carry the log line, Check on top of its real DB
 *     evidence event. Documented in learning/research-os/WORKSPACE.md.
 *   - is metered against a per-learner daily cap (src/lib/research-os/
 *     rate-limit.ts), separate from the existing per-minute burst limiter
 *     below.
 *   - (Check, Organize) logs a best-effort per-call cost estimate from the
 *     provider's own token usage, when reported (llm.ts's logToolCost).
 *
 * ros-14 UPDATE (faded guidance for low-prior-knowledge learners): the
 * "check" case computes an authoritative guidance level server-side --
 * never trusts a client-supplied value, matching every other verdict-
 * relevant input in this route -- via guidance.ts's guidanceLevel, scoped
 * to the CURRENT node's own prerequisite chain (computeFrontier with the
 * checked node itself as target, since this route is node-agnostic by
 * design and has no reliable way to know which page-level target a given
 * nodeId session belongs to; see learning/research-os/GUIDANCE.md section
 * 2 for why this scoping choice is equivalent to the page target's own
 * chain on Phase 0's single connected seed path). A class's own
 * research_os_guidance_enabled switch (db.ts's isGuidanceEnabledForLearner)
 * can force the level to "low" regardless of the computed level, the
 * pilot's control-arm gate. The resulting level adapts grounding.ts's
 * Check prompt (guidance.ts's own header, item 3) and is logged on the
 * resulting evidence event (stages.ts's EvidenceEvent.guidanceLevel) and
 * returned in the response so the workspace page's worked-example display
 * stays consistent with what the tutor's own feedback just used.
 *
 * Request: { action, sessionId?, ...action-specific fields }
 *   locate:   { query, branch? }
 *   quote:    { nodeId }
 *   check:    phase 1 { nodeId, explanation }
 *             phase 2 { nodeId, attemptId, learnerConfidence, sourcePrediction }
 *   organize: { claim, evidenceNotes, sourceNotes }
 *
 * Cognitive forcing on Check (bkt-ros, learning/research-os/
 * PLAN-REVISION-2.md section 2a, the design response to Buçinca, Malaya
 * and Gajos 2021, Bansal et al. 2021, and Vaccaro, Almaatouq and Malone
 * 2024): a phase-1 "check" call grades the explanation right away but,
 * unless this learner's own arm has forcing off (src/lib/research-os/
 * forcing.ts's resolveForcingEnabled, the RESEARCH_OS_FORCING_ENABLED /
 * per-class arm switch), the response carries only { attemptId,
 * forcingRequired: true }, no result/confidence/feedback/citations
 * anywhere in it. Revealing the held verdict needs a phase-2 call on the
 * same attemptId carrying BOTH a valid learnerConfidence (forcing.ts's
 * four-point scale) and a non-empty sourcePrediction; a phase-2 call
 * missing either is 400 and the attempt stays held for a retry. The held
 * verdict itself lives in `graph.check_attempts`
 * (src/lib/research-os/check-attempts-db.ts, migration
 * 20260910070000_research_os_check_attempts.sql): a Vercel deploy can run
 * phase 1 and phase 2 on two different instances, so a bare in-memory
 * store would lose the verdict between them. The gate is enforced in
 * code: the client withholding a "reveal" button is a UI convenience, the
 * server-side check is the real one. scripts/test-research-os-forcing.ts feeds
 * forcing.ts's shared decision functions (checkAttemptAccess,
 * finalizeReveal, the same ones check-attempts-db.ts calls) an attempt and
 * asserts no code path returns its grade without both fields present.
 *
 * Auth: Authorization: Bearer <supabase access token>, required for all four
 * (locate/quote are retrieval-only but still identity-scoped for Phase 0
 * simplicity and to keep the same rate-limit boundary as check/organize).
 *
 * Consent gate (bkt-ros ros-07 follow-up, "consent gate wiring"): every
 * action, including Locate and Quote, is gated by src/lib/research-os/
 * consent.ts's requireConsent, checked right after verifyLearner and
 * before the daily/burst rate limiters. A minor with no consent on file
 * cannot search or quote either, not only Check/Organize: COPPA's floor is
 * collecting personal information from a known minor, and a query or a
 * node id already does that once the caller is a signed-in, identified
 * user. A blocked call returns 403 with consentBlockedBody(gate) as its
 * JSON body.
 */
import { NextRequest, NextResponse } from "next/server";
import { callGroundedModelWithUsage, logToolCost, parseModelJson, selectProvider } from "@/lib/research-os/llm";
import { gradeExplanation, citationLabel } from "@/lib/research-os/grounding";
import { onCheckResult } from "@/lib/research-os/stages";
import { locateHits } from "@/lib/research-os/locate";
import { groundOrganizeResult, type OrganizeModelOutput } from "@/lib/research-os/organize";
import { dailyToolCap, recordAndCheck, dailyCapMessage } from "@/lib/research-os/rate-limit";
import { consentBlockedBody, requireConsent } from "@/lib/research-os/consent";
import { computeFrontier } from "@/lib/research-os/frontier";
import { guidanceLevel as computeGuidanceLevelForLearner } from "@/lib/research-os/guidance";
import type { GuidanceLevel, Stage } from "@/lib/research-os/types";
import {
  configured,
  graphService,
  verifyLearner,
  recordEvidence,
  loadSubgraph,
  loadLearnerStates,
  isGuidanceEnabledForLearner,
  loadForcingEnabledForLearner,
} from "@/lib/research-os/db";
import { getPassage } from "@/lib/research-os/passages";
import type { Provenance } from "@/lib/research-os/types";
import { resolveForcingEnabled } from "@/lib/research-os/forcing";
import { dbStorePendingAttempt, dbRevealPendingAttempt } from "@/lib/research-os/check-attempts-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

const MAX_ORGANIZE_TOKENS = 500;
const MAX_EXPLANATION_CHARS = 2000;
const MAX_SESSION_ID_CHARS = 200;

// Crude in-memory per-user rate limit, mirroring /api/academy/tutor. Best
// effort only (serverless instances are ephemeral); a durable limiter
// belongs in the Viatika metering layer (same TODO the tutor route carries).
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

/** One structured log line per workspace tool call (see this file's header
 * for why Locate/Organize have no other evidence record). Never throws:
 * logging must not be able to fail the request it is describing. */
function logToolCall(tool: string, learnerId: string, sessionId: string | undefined, extra: Record<string, unknown> = {}): void {
  try {
    console.log("[research-os/tool-call]", JSON.stringify({ tool, learnerId, sessionId: sessionId ?? null, at: new Date().toISOString(), ...extra }));
  } catch {
    /* logging is best-effort, never fails the request */
  }
}

function sessionIdOf(body: { sessionId?: string }): string | undefined {
  const s = (body.sessionId || "").trim();
  if (!s) return undefined;
  return s.slice(0, MAX_SESSION_ID_CHARS);
}

/**
 * ros-14: the authoritative guidance level for one Check call, scoped to
 * `nodeId`'s own prerequisite chain (computeFrontier with the checked node
 * itself as target; see this file's header for why). Shared by both Check
 * phases: phase 1 (grading) calls it with the node just graded; phase 2
 * (`dbRevealPendingAttempt`'s reveal branch) calls it again with
 * `pending.nodeId`'s own branch, since a held attempt's own stored shape
 * (`forcing.ts`'s `PendingCheckAttempt`) carries no guidance field --
 * recomputing here at reveal time, rather than extending that store's
 * schema, keeps this bead's own surface self-contained and reflects the
 * learner's guidance level as of the moment the verdict is shown,
 * not as of whenever phase 1 happened to run. Every failure (a fresh
 * environment with no branch subgraph yet, a read error) falls back to
 * "medium," the neutral default, rather than blocking the Check call.
 */
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
  // Cognitive forcing on Check (PLAN-REVISION-2.md section 2a): a first
  // "check" call (no attemptId) submits `explanation`; a second call
  // carries `attemptId` plus the two forcing fields to reveal the held
  // verdict. See this file's "check" case for the full two-phase contract.
  attemptId?: string;
  learnerConfidence?: string;
  sourcePrediction?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");

  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  const gate = await requireConsent(learnerId, "workspace_tool");
  if (!gate.allowed) return NextResponse.json(consentBlockedBody(gate), { status: 403 });

  if (rateLimited(learnerId)) return bad(429, "Too many workspace requests. Slow down a moment.");

  const cap = dailyToolCap();
  if (!recordAndCheck(learnerId, cap).allowed) return bad(429, dailyCapMessage(cap));

  let body: WorkspaceBody;
  try {
    body = (await req.json()) as WorkspaceBody;
  } catch {
    return bad(400, "bad_request");
  }
  const sessionId = sessionIdOf(body);

  const svc = graphService();

  switch (body.action) {
    case "locate": {
      const query = (body.query || "").trim();
      if (!query) return bad(400, "query is required");
      const branch = body.branch || "02-physics";
      const { data, error } = await svc
        .from("nodes")
        .select("id,slug,title,kind,tier,summary,provenance")
        .eq("branch", branch);
      if (error) return bad(500, "locate_failed");
      const hits = locateHits((data || []) as Parameters<typeof locateHits>[0], query);
      logToolCall("locate", learnerId, sessionId, { branch, resultCount: hits.length });
      return NextResponse.json({ results: hits }, { headers: { "cache-control": "no-store" } });
    }

    case "quote": {
      const nodeId = (body.nodeId || "").trim();
      if (!nodeId) return bad(400, "nodeId is required");
      const { data: node, error } = await svc
        .from("nodes")
        .select("id,slug,title,summary,provenance")
        .eq("id", nodeId)
        .maybeSingle();
      if (error || !node) return bad(404, "node_not_found");
      const p = (node.provenance || {}) as Provenance;

      // Phase 1 (bkt-ros, closing stub list item "full passage-level source
      // extraction"): a small curated table (src/lib/research-os/passages.ts)
      // carries a real, under-90-word, verbatim passage with a locator for
      // every node whose source text we have independently verified --
      // Tyndall 1869, Rayleigh 1871, NASA Space Place, and the cited
      // Wikipedia revisions. A node not in that table (no verified full-text
      // access to its primary source yet, e.g. Rayleigh's third 1871 paper,
      // or a canon-bridge node with no provenance of its own) falls back to
      // the node's own seeded summary, labeled "summary" rather than
      // "quote" so the client never presents a paraphrase as a verbatim
      // quotation.
      const passage = getPassage(node.slug);
      logToolCall("quote", learnerId, sessionId, { nodeId, kind: passage ? "quote" : "summary" });
      return NextResponse.json(
        {
          nodeId: node.id,
          kind: passage ? "quote" : "summary",
          quotable_span: passage ? passage.text : node.summary,
          locator: passage ? passage.locator : null,
          citation: citationLabel({ title: node.title, provenance: p }),
          source: { author: p.author, year: p.year, title: p.title, publisher: p.publisher, doi: p.doi, url: passage?.url ?? p.url, license: p.license },
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    case "check": {
      const nodeId = (body.nodeId || "").trim();
      const attemptId = (body.attemptId || "").trim();

      // Phase 2: reveal a held verdict. Requires the forcing commit
      // (confidence + a source prediction) in THIS same request -- there
      // is no separate "peek" call, so a request carrying only attemptId
      // can never come back with feedback (scripts/test-research-os-
      // forcing.ts's "cannot be fetched early" case).
      if (attemptId) {
        const reveal = await dbRevealPendingAttempt(attemptId, learnerId, body.learnerConfidence, body.sourcePrediction || "");
        if (!reveal.ok) {
          if (reveal.reason === "not_found") return bad(404, "check_attempt_not_found");
          return bad(400, "A confidence rating and a source prediction are required before feedback is shown.");
        }
        const { attempt: pending, learnerConfidence: learnerConfidenceRaw, sourcePrediction, predictionCorrect } = reveal;

        // ros-14: recomputed at reveal time (this file's computeGuidanceForNode
        // header explains why). A pending attempt's own node.branch is not
        // stored on it, so this one extra lookup resolves it first.
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
            guidanceLevel: revealGuidance,
          },
        );
        await recordEvidence(learnerId, pending.nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
        logToolCall("check", learnerId, pending.sessionId, {
          nodeId: pending.nodeId,
          result: pending.grade.result,
          abstained: pending.grade.abstained,
          stage: transition.nextStage,
          forcingEnabled: true,
          predictionCorrect,
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
            guidance: revealGuidance,
          },
          { headers: { "cache-control": "no-store" } },
        );
      }

      // Phase 1: submit the explanation and grade it. The verdict is
      // computed here but is only ever returned immediately when this
      // learner's own arm has forcing off; otherwise it is held (see
      // src/lib/research-os/forcing.ts's module header) until phase 2
      // above supplies the commit step.
      const explanation = (body.explanation || "").trim();
      if (!nodeId) return bad(400, "nodeId is required");
      if (!explanation) return bad(400, "explanation is required");
      if (explanation.length > MAX_EXPLANATION_CHARS) return bad(400, "explanation too long");

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
        const { data: prereqNodes } = await svc.from("nodes").select("title,summary").in("id", prereqIds);
        prereqSummaries = prereqNodes || [];
      }

      // ros-14: an authoritative guidance level (computeGuidanceForNode
      // above), reused unchanged for the "check" evidence event and the
      // response whichever path below is taken (forcing off, or the phase-2
      // reveal once forcing commits).
      const guidance = await computeGuidanceForNode(learnerId, nodeId, node.branch);

      const provider = selectProvider();
      if (!provider) return bad(503, "Check isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

      let safe: Awaited<ReturnType<typeof gradeExplanation>>;
      try {
        safe = await gradeExplanation(provider, node, prereqSummaries, explanation, guidance, getPassage(node.slug));
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err?.status === 401) return bad(503, "Check credentials are invalid on the server.");
        if (err?.status === 429) return bad(429, "Rate limited, try again in a moment.");
        return bad(502, "check_failed");
      }
      logToolCost("check", learnerId, provider, safe.usage);

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
        // Comparison arm (or RESEARCH_OS_FORCING_ENABLED=false): the
        // pre-forcing behavior, verdict revealed immediately, logged with
        // forcingEnabled:false so analysis can tell this arm apart from
        // the default-on arm using the evidence log alone. guidanceLevel
        // (ros-14) is independent of forcing and is logged either way.
        const transition = onCheckResult(
          currentStage,
          { result: safe.result, confidence: safe.confidence, abstained: safe.abstained },
          { learnerText: explanation, modelFeedback: safe.feedback, citations: safe.citations, sessionId, forcingEnabled: false, guidanceLevel: guidance },
        );
        await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
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

      // No result/confidence/feedback/citations key anywhere in this body:
      // the whole point of the held attempt is that nothing in this
      // response can be read as the verdict. `guidance` (ros-14) is safe to
      // include, it is a display-only scaffolding level, never the graded
      // result; the reveal call above recomputes its own authoritative
      // value rather than trusting whatever this response said.
      return NextResponse.json({ attemptId: newAttemptId, forcingRequired: true, forcingEnabled: true, guidance }, { headers: { "cache-control": "no-store" } });
    }

    case "organize": {
      const claim = (body.claim || "").trim();
      const evidenceNotes = (body.evidenceNotes || "").trim();
      const sourceNotes = (body.sourceNotes || "").trim();
      if (!claim && !evidenceNotes && !sourceNotes) return bad(400, "at least one field is required");

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

      // Contract enforcement (task item 2, organize.ts's own header): a
      // parseable-but-adversarial model response is run through
      // groundOrganizeResult, which drops any item not grounded in the
      // matching input field, in code. A totally unparseable response (the
      // model ignored the "JSON only" instruction) falls back to echoing
      // the learner's own raw notes verbatim, never to any model text --
      // the same fail-safe posture parseModelJson documents for Check.
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
}
