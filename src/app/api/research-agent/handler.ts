import { NextResponse, type NextRequest } from "next/server";
import type { Provider } from "@/lib/llm/client";
import type { RequestUser } from "@/lib/auth/verify";
import { capsFor, checkDailyLimits, type DailyCaps, type DailyLimiter } from "@/lib/llm/daily-limit";
import { bad, limitResponse, NO_STORE, readBody } from "@/lib/llm/route-guard";

export const MAX_BODY_BYTES = 4096;
export const MAX_QUESTION_CHARS = 1200;
const MIN_QUESTION_CHARS = 8;

export interface AgentDeps<T> {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  provider: () => Provider | null;
  limiter: () => DailyLimiter | null;
  caps?: () => DailyCaps;
  run: (question: string, provider: NonNullable<Provider>) => Promise<T>;
  now?: () => Date;
}

export async function handleAgent<T>(req: NextRequest, deps: AgentDeps<T>): Promise<NextResponse> {
  const user = await deps.verifyUser(req);
  if (!user) return bad(401, "Sign in to use the research agent.", { signIn: true });

  const read = await readBody(req, MAX_BODY_BYTES);
  if (read.error) return read.error;
  const body = (read.body && typeof read.body === "object" ? read.body : {}) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < MIN_QUESTION_CHARS) return bad(400, "Ask a research question (at least 8 characters).");
  if (question.length > MAX_QUESTION_CHARS) return bad(400, `Question exceeds ${MAX_QUESTION_CHARS} characters.`);

  const provider = deps.provider();
  if (!provider) return bad(503, "The research agent isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

  const limiter = deps.limiter();
  if (!limiter) return bad(503, "Research agent usage limits are unavailable on the server.");
  let verdict;
  try {
    verdict = await checkDailyLimits(limiter, user.id, "agent", deps.caps ? deps.caps() : capsFor("agent"), deps.now ? deps.now() : new Date());
  } catch {
    return bad(503, "Research agent usage limits are unavailable on the server.");
  }
  if (!verdict.allowed) return limitResponse("research agent", verdict);

  try {
    const brief = await deps.run(question, provider);
    return NextResponse.json(brief, { status: 200, headers: NO_STORE });
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err?.status === 401) return bad(503, "Research-agent credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "The model provider is rate limiting the research agent. Try again in a moment.");
    return bad(502, "The research agent couldn't complete the run. The GPU box may be offline. Try again shortly.");
  }
}
