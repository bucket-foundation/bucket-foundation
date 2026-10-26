import { NextResponse, type NextRequest } from "next/server";
import { buildReport } from "@/lib/beta/metrics";
import type { BetaStore } from "@/lib/beta/store";
import { adminKeyMatches } from "@/lib/waitlist/store";

const NO_STORE = { "cache-control": "no-store" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COHORT_RE = /^[a-z0-9_-]{1,32}$/;
export const REPORT_WINDOW_DAYS = 90;

export interface BetaAdminDeps {
  adminKey: () => string | undefined;
  store: () => BetaStore | null;
  now?: () => Date;
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function authorized(req: NextRequest, deps: BetaAdminDeps): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  return adminKeyMatches(given, deps.adminKey());
}

function notFound(): NextResponse {
  return new NextResponse("Not Found", { status: 404, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" } });
}

export async function handleBetaReport(req: NextRequest, deps: BetaAdminDeps): Promise<NextResponse> {
  if (!authorized(req, deps)) return notFound();
  const store = deps.store();
  if (!store) return json({ error: "store_unavailable" }, 503);
  const now = deps.now?.() ?? new Date();
  try {
    const since = new Date(now.getTime() - REPORT_WINDOW_DAYS * 86_400_000).toISOString();
    const [testers, events] = await Promise.all([store.testers(), store.events(since)]);
    return json({ ...buildReport(testers, events.rows, now), truncated: events.truncated });
  } catch (err) {
    console.error("[admin/beta] report failed:", err instanceof Error ? err.message : err);
    return json({ error: "report_failed" }, 502);
  }
}

export async function handleSetCohort(req: NextRequest, deps: BetaAdminDeps): Promise<NextResponse> {
  if (!authorized(req, deps)) return notFound();
  const store = deps.store();
  if (!store) return json({ error: "store_unavailable" }, 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const b = body as { user_id?: unknown; cohort?: unknown } | null;
  if (!b || typeof b.user_id !== "string" || !UUID_RE.test(b.user_id)) return json({ error: "bad_user_id" }, 400);
  if (typeof b.cohort !== "string" || !COHORT_RE.test(b.cohort)) return json({ error: "bad_cohort" }, 400);
  try {
    const ok = await store.setCohort(b.user_id.toLowerCase(), b.cohort);
    return ok ? json({ ok: true }) : json({ error: "not_found" }, 404);
  } catch (err) {
    console.error("[admin/beta] cohort update failed:", err instanceof Error ? err.message : err);
    return json({ error: "update_failed" }, 502);
  }
}
