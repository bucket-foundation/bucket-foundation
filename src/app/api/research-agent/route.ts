/**
 * POST /api/research-agent, the Bucket research agent (produce-side wedge).
 *
 * Given a research question it runs a grounded loop, 
 * PLAN → RETRIEVE → SYNTHESIZE → OUTPUT, 
 * and returns a CITED, REPRODUCIBLE brief. It mirrors the Academy tutor
 * (`src/app/api/academy/tutor/route.ts`): same LLM seam (local GPU LLM via the
 * OpenAI-compatible auth-shim + cloudflared tunnel is the DEFAULT, hosted
 * Anthropic is the fallback, neither => 503 dark), same S1, S7 safety posture
 * enforced IN CODE (closed-set citations, abstain on thin grounding, fail-safe
 * on unparseable output, no fabricated DOIs/citations), same graceful 502 when
 * the GPU box is offline.
 *
 * The heavy lifting lives in ./agent (testable; Next.js forbids non-handler
 * exports from a route file). Retrieval draws ONLY from public/documented
 * assets: the Bucket canon claim index, OpenAlex, PubMed, research-atlas, and
 * the live MethodsMatcher tool.
 *
 * Request body (JSON): { question: string }
 * Response (200): a Brief (see ./agent Brief type) + cache-control: no-store.
 * Errors: 400 bad input · 429 rate-limited · 502 agent_failed · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { selectProvider } from "./provider";
import { runResearchAgent } from "./agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION_CHARS = 1200;
const MIN_QUESTION_CHARS = 8;

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

// Crude in-memory per-IP rate limit, a research run fans out to several
// upstreams + a GPU synthesis, so the budget is tighter than the tutor's.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 8; // 8 briefs / minute / IP
const rlBuckets = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rlBuckets.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  rlBuckets.set(ip, hits);
  if (rlBuckets.size > 5000) {
    rlBuckets.forEach((v, k) => {
      if (v.every((t) => now - t >= RL_WINDOW_MS)) rlBuckets.delete(k);
    });
  }
  return hits.length > RL_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  if (rateLimited(ip)) {
    return bad(429, "Too many research requests. Slow down a moment.");
  }

  let body: { question?: string };
  try {
    body = (await req.json()) as { question?: string };
  } catch {
    return bad(400, "Request body must be JSON.");
  }

  const question = (body?.question || "").trim();
  if (question.length < MIN_QUESTION_CHARS) return bad(400, "Ask a research question (at least 8 characters).");
  if (question.length > MAX_QUESTION_CHARS) return bad(400, `Question exceeds ${MAX_QUESTION_CHARS} characters.`);

  // 503 when NO provider is configured, same graceful contract as the tutor.
  // Local GPU LLM (LLM_BASE_URL) is the default; Anthropic is the fallback.
  const provider = selectProvider();
  if (!provider) {
    return bad(503, "The research agent isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");
  }

  // TODO(deploy): route synthesis spend through Viatika (@/lib/meter), pre-charge
  // an estimate, true-up from usage. Org standard: all metered AI spend flows
  // through the Viatika vendor API (CLAUDE.md #6). Hook left for v1, matching the
  // tutor + generate routes.

  try {
    const brief = await runResearchAgent(question, provider);
    return NextResponse.json(brief, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err?.status === 401) return bad(503, "Research-agent credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "Rate limited upstream — try again in a moment.");
    // Timeout / network error to the local GPU LLM, or any other failure: fail
    // safe with a 502 (the client renders the founder-GPU-offline notice).
    return bad(502, "The research agent couldn't complete the run. The GPU box may be offline — try again shortly.");
  }
}
