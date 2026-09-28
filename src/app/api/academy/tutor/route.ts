import type { NextRequest } from "next/server";
import { complete, localLlmConfig, selectProvider } from "@/lib/llm/client";
import { verifyRequestUser } from "@/lib/auth/verify";
import { findTutorAtom } from "@/lib/academy/find-atom";
import { configured, graphService } from "@/lib/research-os/db";
import { dbLimiter } from "@/lib/llm/daily-limit";
import { recordServerEvent } from "@/lib/academy/events-server";
import { estimateCostUsd } from "@/lib/research-os/llm";
import { handleTutor, MODEL } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL = localLlmConfig(20);

export async function POST(req: NextRequest) {
  return handleTutor(req, {
    verifyUser: verifyRequestUser,
    provider: selectProvider,
    limiter: () => (configured() ? dbLimiter(graphService()) : null),
    findAtom: findTutorAtom,
    complete,
    local: LOCAL,
    recordTurn: (userId, props) => recordServerEvent(userId, "tutor_turn", props),
    costUsd: (usage) => estimateCostUsd(usage, MODEL),
  });
}
