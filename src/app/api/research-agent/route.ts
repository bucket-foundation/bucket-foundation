import type { NextRequest } from "next/server";
import { selectProvider } from "@/lib/llm/provider";
import { verifyRequestUser } from "@/lib/auth/verify";
import { configured, graphService } from "@/lib/research-os/db";
import { dbLimiter } from "@/lib/llm/daily-limit";
import { isResearchAgentEmail } from "@/lib/research-os/reviewer";
import { runResearchAgent } from "./agent";
import { handleAgent } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleAgent(req, {
    verifyUser: verifyRequestUser,
    isAllowed: (user) => isResearchAgentEmail(user.email),
    provider: selectProvider,
    limiter: () => (configured() ? dbLimiter(graphService()) : null),
    run: runResearchAgent,
  });
}
