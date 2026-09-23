import type { ProbeAnswerResponse } from "@/lib/research-os/api-shapes";
import { NextResponse } from "next/server";
import { ancestorsOf } from "@/lib/research-os/closure";
import { buildProbe } from "@/lib/research-os/probe";
import { gradeExplanation } from "@/lib/research-os/grounding";
import { logToolCost, selectProvider } from "@/lib/research-os/llm";
import { onProbeCheckResult } from "@/lib/research-os/stages";
import { graphService, loadSubgraph, loadLearnerStates, recordEvidence } from "@/lib/research-os/db";
import { authorizeNode, authorizeNodes } from "@/lib/research-os/read-access";
import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { evidenceErrorResponse } from "@/lib/research-os/evidence-errors";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ANSWER_CHARS = 2000;

export const GET = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
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

  const filtered = await filterSubgraphForViewer(nodes, edges, learnerId);
  if (!filtered.ok) return bad(503, "access_unavailable");
  ({ nodes, edges } = filtered);

  const target = nodes.find((n) => n.slug === targetSlug);
  if (!target) return bad(404, "target_not_found");

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
});

interface ProbeBody {
  nodeId?: string;
  answer?: string;
  sessionId?: string;
}

export const POST = withResearchOsRoute({ auth: "required", consent: "probe_answer" }, async (req, { learnerId }) => {
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as ProbeBody;
  const nodeId = (body.nodeId || "").trim();
  const answer = (body.answer || "").trim();
  const sessionId = (body.sessionId || "").trim() || undefined;
  if (!nodeId) return bad(400, "nodeId is required");
  if (!answer) return bad(400, "answer is required");
  if (answer.length > MAX_ANSWER_CHARS) return bad(400, "answer too long");

  const svc = graphService();

  const continuable = await authorizeNode(nodeId, { id: learnerId }, "continue");
  if (!continuable.ok) {
    if (continuable.reason === "unavailable") return bad(503, "access_unavailable");
    return bad(404, "node_not_found");
  }

  const { data: node, error: nodeErr } = await svc.from("nodes").select("id,title,summary,provenance").eq("id", nodeId).maybeSingle();
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
    if (prereqSummaries.length === 0) return bad(409, "probe_grounding_unavailable");
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
  try {
    await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
  } catch (err) {
    const mapped = evidenceErrorResponse(err);
    if (mapped) return mapped;
    throw err;
  }

  const payload: ProbeAnswerResponse = {
    result: graded.result,
    confidence: graded.confidence,
    abstained: graded.abstained,
    feedback: graded.feedback,
    stage: transition.nextStage,
  };
  return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
});
