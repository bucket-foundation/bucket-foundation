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

const RL_WINDOW_MS = 60_000;
const RL_MAX = 8;
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

  const provider = selectProvider();
  if (!provider) {
    return bad(503, "The research agent isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");
  }

  try {
    const brief = await runResearchAgent(question, provider);
    return NextResponse.json(brief, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err?.status === 401) return bad(503, "Research-agent credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "Rate limited upstream — try again in a moment.");
    return bad(502, "The research agent couldn't complete the run. The GPU box may be offline — try again shortly.");
  }
}
