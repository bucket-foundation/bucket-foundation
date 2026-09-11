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
import { onCheckResult, onQuoteReturned } from "@/lib/research-os/stages";
import { locateHits } from "@/lib/research-os/locate";
import { groundOrganizeResult, type OrganizeModelOutput } from "@/lib/research-os/organize";
import { dailyToolCap, recordAndCheck, dailyCapMessage } from "@/lib/research-os/rate-limit";
import { consentBlockedBody, requireConsent } from "@/lib/research-os/consent";
import type { Stage } from "@/lib/research-os/types";
import { configured, graphService, verifyLearner, recordEvidence, loadCurrentStage, loadForcingEnabledForLearner } from "@/lib/research-os/db";
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

      // Production guard, task item 1: a Production's own cited sources are
      // only verifiable against a Quote call this learner made. Recorded
      // only for a real, curated passage (a "quote" result), since the
      // "summary" fallback carries no locator for production-guard.ts's
      // checkSourceProvenance to match against.
      // Best-effort: a write failure here degrades to "this source can't be
      // verified later," never to a broken Quote response for the learner
      // in front of it right now.
      if (passage) {
        try {
          const currentStage = await loadCurrentStage(learnerId, nodeId);
          const transition = onQuoteReturned(currentStage, { sessionId, locator: passage.locator });
          await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
        } catch {
          /* best-effort, see comment above */
        }
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
        .select("id,title,summary,provenance")
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

      const provider = selectProvider();
      if (!provider) return bad(503, "Check isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

      let safe: Awaited<ReturnType<typeof gradeExplanation>>;
      try {
        safe = await gradeExplanation(provider, node, prereqSummaries, explanation);
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
        // the default-on arm using the evidence log alone.
        const transition = onCheckResult(
          currentStage,
          { result: safe.result, confidence: safe.confidence, abstained: safe.abstained },
          { learnerText: explanation, modelFeedback: safe.feedback, citations: safe.citations, sessionId, forcingEnabled: false },
        );
        await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
        logToolCall("check", learnerId, sessionId, { nodeId, result: safe.result, abstained: safe.abstained, stage: transition.nextStage, forcingEnabled: false });

        return NextResponse.json(
          {
            result: safe.result,
            confidence: safe.confidence,
            abstained: safe.abstained,
            feedback: safe.feedback,
            citations: safe.citations,
            stage: transition.nextStage,
            forcingEnabled: false,
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
      logToolCall("check", learnerId, sessionId, { nodeId, forcingEnabled: true, forcingRequired: true });

      // No result/confidence/feedback/citations key anywhere in this body:
      // the whole point of the held attempt is that nothing in this
      // response can be read as the verdict.
      return NextResponse.json({ attemptId: newAttemptId, forcingRequired: true, forcingEnabled: true }, { headers: { "cache-control": "no-store" } });
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
