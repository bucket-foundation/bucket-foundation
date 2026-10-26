import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import { BETA_APPS, type BetaApp } from "@/lib/beta/events";
import { applyHeld, flagsFor, newAssignments } from "@/lib/beta/experiments";
import type { BetaStore } from "@/lib/beta/store";

const NO_STORE = { "cache-control": "no-store" };

export interface BetaFlagsDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  store: () => BetaStore | null;
  now?: () => Date;
}

function reply(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function handleBetaFlags(req: NextRequest, deps: BetaFlagsDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "flags_unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);
  const app = req.nextUrl.searchParams.get("app") ?? "";
  if (!BETA_APPS.includes(app as BetaApp)) return reply({ error: "bad_app" }, 400);
  try {
    const [tester, settings, held] = await Promise.all([store.tester(user.id, app as BetaApp), store.cohortSettings(), store.assignments(user.id)]);
    const fresh = flagsFor(user.id, tester.cohort, settings);
    await store.recordAssignments(newAssignments(user.id, tester.cohort, fresh, held, deps.now?.() ?? new Date()));
    const stored = await store.assignments(user.id);
    return reply({ cohort: tester.cohort, flags: applyHeld(fresh, stored) }, 200);
  } catch (err) {
    console.error("[beta/flags] read failed:", err instanceof Error ? err.message : err);
    return reply({ error: "flags_failed" }, 500);
  }
}
