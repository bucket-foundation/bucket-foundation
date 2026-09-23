import { NextRequest, NextResponse } from "next/server";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { authorizeNode } from "@/lib/research-os/read-access";
import { authorizeHypothesize } from "@/lib/research-os/hypothesize-auth";
import type { HypothesizeResult } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTE_SERVE_URL = (process.env.HTE_SERVE_URL ?? "http://127.0.0.1:8420").replace(/\/+$/, "");
const HTE_TIMEOUT_MS = Number(process.env.HTE_SERVE_TIMEOUT_S ?? 20) * 1000;

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface HypothesizeBody {
  productionId?: string;
}

interface HteServeResponse {
  ok?: boolean;
  error?: string;
  run_id?: string;
  artifact_version?: string | null;
  models?: { roles: Record<string, string>; escalation: string } | null;
  corpus?: {
    n_productions?: number; status_min?: string; prior_profile?: string;
    n_sources?: number | null; n_evidence?: number | null;
    n_hypotheses_generated?: number | null; n_survivors?: number | null;
  };
  timeline?: { bins?: Array<{ time_bin: string; ranked_hypotheses: unknown[] }> };
  gap_nodes?: Array<{ id: string; kind: string; description: string; value_of_information: number }>;
  calibration?: { mode: string | null; brier_score: number | null; coverage_of_truth: number | null } | null;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  let body: HypothesizeBody;
  try {
    body = (await req.json()) as HypothesizeBody;
  } catch {
    return bad(400, "bad_request");
  }
  const productionId = (body.productionId || "").trim();
  if (!productionId) return bad(400, "productionId is required");

  const svc = graphService();

  const { data: production, error: prodErr } = await svc
    .from("productions")
    .select("*")
    .eq("id", productionId)
    .maybeSingle();
  if (prodErr) return bad(500, "read_failed");
  if (!authorizeHypothesize(production, learnerId)) return bad(404, "production_not_found");

  const readable = await authorizeNode(production.target_node_id as string, { id: learnerId }, "view");
  if (!readable.ok) {
    if (readable.reason === "unavailable") return bad(503, "access_unavailable");
    return bad(404, "production_not_found");
  }

  const { data: node } = await svc
    .from("nodes")
    .select("slug,title,tier,branch")
    .eq("id", production.target_node_id)
    .maybeSingle();

  const payload = {
    productions: [{ ...production, _target_node: node ?? undefined }],
    status_min: "draft",
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTE_TIMEOUT_MS);
  let hteResponse: Response;
  try {
    hteResponse = await fetch(`${HTE_SERVE_URL}/hypothesize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err?.name === "AbortError") return bad(504, "hte_serve_timeout");
    return bad(502, "hte_serve_unreachable");
  } finally {
    clearTimeout(timer);
  }

  const hteBody = (await hteResponse.json().catch(() => null)) as HteServeResponse | null;
  if (!hteResponse.ok || !hteBody || hteBody.ok === false) {
    return bad(502, hteBody?.error || `hte-serve returned ${hteResponse.status}`);
  }

  const result: HypothesizeResult = {
    runId: hteBody.run_id ?? "",
    artifactVersion: hteBody.artifact_version ?? null,
    models: hteBody.models ?? null,
    corpus: {
      nProductions: hteBody.corpus?.n_productions ?? 0,
      statusMin: hteBody.corpus?.status_min ?? "draft",
      priorProfile: hteBody.corpus?.prior_profile ?? "consensus",
      nSources: hteBody.corpus?.n_sources ?? null,
      nEvidence: hteBody.corpus?.n_evidence ?? null,
      nHypothesesGenerated: hteBody.corpus?.n_hypotheses_generated ?? null,
      nSurvivors: hteBody.corpus?.n_survivors ?? null,
    },
    timeline: {
      bins: (hteBody.timeline?.bins ?? []).map((b) => ({ timeBin: b.time_bin, rankedHypotheses: b.ranked_hypotheses })),
    },
    gapNodes: (hteBody.gap_nodes ?? []).map((g) => ({
      id: g.id, kind: g.kind, description: g.description, valueOfInformation: g.value_of_information,
    })),
    calibration: hteBody.calibration
      ? { mode: hteBody.calibration.mode, brierScore: hteBody.calibration.brier_score, coverageOfTruth: hteBody.calibration.coverage_of_truth }
      : null,
  };

  return NextResponse.json({ result }, { headers: { "cache-control": "no-store" } });
}
