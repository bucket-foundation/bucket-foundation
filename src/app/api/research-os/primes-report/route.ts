import { NextResponse, type NextRequest } from "next/server";
import { staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";
import { readPrimesViewState } from "@/lib/research-os/primes-view-state";
import { NO_STORE } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = staffOnlyAtLaunch(async (_req: NextRequest): Promise<Response> => {
  const state = await readPrimesViewState();
  if (state.kind === "ready") return NextResponse.json(state.report, NO_STORE);
  const error = state.kind === "unconfigured" ? "research_os_unavailable" : "graph_unavailable";
  return NextResponse.json({ error }, { status: 503, ...NO_STORE });
});
