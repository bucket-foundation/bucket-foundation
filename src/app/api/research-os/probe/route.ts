/**
 * /api/research-os/probe, the diagnostic probe (bkt-ros, Phase 1 item 2,
 * closing the Phase 0 PR's stub list item "Diagnostic-probe generalization
 * for cold-start learners"). Fires only for a learner with no state record
 * on any ancestor of the target (src/lib/research-os/probe.ts's probeDue,
 * per RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3 step 5), asking 3-5
 * questions at rising tiers over that ancestor set.
 *
 * GET  ?target=<slug>&branch=<branch>  -> { due, target, questions: [...] }
 *   Auth REQUIRED (unlike GET /api/research-os/route's optional auth): a
 *   probe's due-ness is defined entirely by the caller's own ancestor
 *   state, so there is no meaningful anonymous answer to compute.
 *
 * POST { nodeId, answer } -> grades ONE probe question. Reuses the exact
 *   Check tool grading call (src/lib/research-os/grounding.ts's
 *   gradeExplanation, task item 2's "graded by the existing grounded tutor
 *   Check action") and applies src/lib/research-os/stages.ts's
 *   onProbeCheckResult, which gives a cold-start probe answer a different
 *   stage jump than onCheckResult gives an in-path Check answer. The AI
 *   never writes the learner's answer: gradeExplanation
 *   only ever returns a verdict and feedback, matching the workspace Check
 *   action's own S7 floor.
 *
 * Auth: Authorization: Bearer <supabase access token>, required for both.
 * 401 unauthorized · 400 bad input · 404 target/node not found ·
 * 429/502/503 provider errors · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { ancestorsOf } from "@/lib/research-os/closure";
import { buildProbe } from "@/lib/research-os/probe";
import { gradeExplanation } from "@/lib/research-os/grounding";
import { logToolCost, selectProvider } from "@/lib/research-os/llm";
import { onProbeCheckResult } from "@/lib/research-os/stages";
import { configured, graphService, loadSubgraph, loadLearnerStates, verifyLearner, recordEvidence } from "@/lib/research-os/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

const MAX_ANSWER_CHARS = 2000;

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  const { searchParams } = new URL(req.url);
  const targetSlug = (searchParams.get("target") || "why-the-sky-is-blue").trim();
  const branch = (searchParams.get("branch") || "02-physics").trim();
  if (!targetSlug) return bad(400, "target is required");

  let nodes, edges;
  try {
    ({ nodes, edges } = await loadSubgraph(branch));
  } catch {
    return bad(500, "graph_load_failed");
  }
  const target = nodes.find((n) => n.slug === targetSlug);
  if (!target) return bad(404, "target_not_found");

  // Phase 0/1: the ancestor set is computed directly from graph.edges
  // (closure.ts's ancestorsOf), the same dependency-free walk frontier.ts's
  // fallback path uses, rather than requiring graph.prereq_ancestor to be
  // populated first.
  const ancestorIds = new Set(ancestorsOf(target.id, edges).keys());
  const states = await loadLearnerStates(learnerId, nodes.map((n) => n.id));
  const probe = buildProbe(nodes, ancestorIds, states);

  return NextResponse.json(
    {
      target: { id: target.id, slug: target.slug, title: target.title },
      due: probe.due,
      questions: probe.questions,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

interface ProbeBody {
  nodeId?: string;
  answer?: string;
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  let body: ProbeBody;
  try {
    body = (await req.json()) as ProbeBody;
  } catch {
    return bad(400, "bad_request");
  }
  const nodeId = (body.nodeId || "").trim();
  const answer = (body.answer || "").trim();
  const sessionId = (body.sessionId || "").trim() || undefined;
  if (!nodeId) return bad(400, "nodeId is required");
  if (!answer) return bad(400, "answer is required");
  if (answer.length > MAX_ANSWER_CHARS) return bad(400, "answer too long");

  const svc = graphService();
  const { data: node, error: nodeErr } = await svc.from("nodes").select("id,title,summary,provenance").eq("id", nodeId).maybeSingle();
  if (nodeErr || !node) return bad(404, "node_not_found");

  // Same grounding shape Check builds: the node's own summary plus its
  // prerequisites' summaries, even though a cold-start probe learner has
  // (by definition) no recorded state on any of them yet.
  const { data: prereqEdges } = await svc.from("edges").select("from_id").eq("to_id", nodeId).eq("kind", "prerequisite");
  const prereqIds = (prereqEdges || []).map((e: { from_id: string }) => e.from_id);
  let prereqSummaries: { title: string; summary: string | null }[] = [];
  if (prereqIds.length) {
    const { data: prereqNodes } = await svc.from("nodes").select("title,summary").in("id", prereqIds);
    prereqSummaries = prereqNodes || [];
  }

  const provider = selectProvider();
  if (!provider) return bad(503, "The diagnostic probe isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

  let graded: Awaited<ReturnType<typeof gradeExplanation>>;
  try {
    graded = await gradeExplanation(provider, node, prereqSummaries, answer);
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err?.status === 401) return bad(503, "Probe grading credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "Rate limited, try again in a moment.");
    return bad(502, "probe_grade_failed");
  }
  logToolCost("probe", learnerId, provider, graded.usage);

  const transition = onProbeCheckResult(
    { result: graded.result, confidence: graded.confidence, abstained: graded.abstained },
    { learnerText: answer, modelFeedback: graded.feedback, citations: graded.citations, sessionId },
  );
  await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);

  return NextResponse.json(
    {
      result: graded.result,
      confidence: graded.confidence,
      abstained: graded.abstained,
      feedback: graded.feedback,
      stage: transition.nextStage,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
