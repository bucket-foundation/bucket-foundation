import { NextResponse, type NextRequest } from "next/server";
import { buildReport, summarizeGroup } from "@/lib/beta/metrics";
import type { BetaStore } from "@/lib/beta/store";
import { buildGrowthReport, type GrowthReport } from "@/lib/growth/report";
import { parseSnapshot, SNAPSHOT_LIMITS } from "@/lib/growth/snapshot";
import type { SnapshotStore } from "@/lib/growth/store";
import type { WaitlistEntry } from "@/lib/waitlist/core";
import { adminKeyMatches } from "@/lib/waitlist/store";

const NO_STORE = { "cache-control": "no-store" };
export const GROWTH_WINDOW_DAYS = 90;

export interface GrowthDeps {
  adminKey: () => string | undefined;
  beta: () => BetaStore | null;
  snapshots: () => SnapshotStore | null;
  waitlist: () => Promise<WaitlistEntry[] | null>;
  now?: () => Date;
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function authorized(req: NextRequest, deps: GrowthDeps): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  return adminKeyMatches(given, deps.adminKey());
}

function notFound(): NextResponse {
  return new NextResponse("Not Found", { status: 404, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" } });
}

export async function loadGrowthReport(
  beta: BetaStore,
  snapshots: SnapshotStore,
  waitlist: () => Promise<WaitlistEntry[] | null>,
  now: Date,
): Promise<GrowthReport & { truncated: boolean }> {
  const since = new Date(now.getTime() - GROWTH_WINDOW_DAYS * 86_400_000).toISOString();
  const [testers, events, snapshot, signups] = await Promise.all([beta.testers(), beta.events(since), snapshots.latest(), waitlist()]);
  const report = buildReport(testers, events.rows, now);
  const overall = summarizeGroup("all", report.users);
  return { ...buildGrowthReport({ waitlist: signups, beta: report, overall, snapshot, testers, events: events.rows, now }), truncated: events.truncated };
}

export async function handleGrowthReport(req: NextRequest, deps: GrowthDeps): Promise<NextResponse> {
  if (!authorized(req, deps)) return notFound();
  const beta = deps.beta();
  const snapshots = deps.snapshots();
  if (!beta || !snapshots) return json({ error: "store_unavailable" }, 503);
  try {
    return json(await loadGrowthReport(beta, snapshots, deps.waitlist, deps.now?.() ?? new Date()));
  } catch (err) {
    console.error("[admin/growth] report failed:", err instanceof Error ? err.message : err);
    return json({ error: "report_failed" }, 502);
  }
}

export async function handleGrowthSnapshot(req: NextRequest, deps: GrowthDeps): Promise<NextResponse> {
  if (!authorized(req, deps)) return notFound();
  const snapshots = deps.snapshots();
  if (!snapshots) return json({ error: "store_unavailable" }, 503);
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > SNAPSHOT_LIMITS.maxBytes) return json({ error: "too_large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = parseSnapshot(raw);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  try {
    await snapshots.save(parsed.value);
    return json({ ok: true, testers: parsed.value.testers.length, builds: parsed.value.builds.length });
  } catch (err) {
    console.error("[admin/growth] snapshot save failed:", err instanceof Error ? err.message : err);
    return json({ error: "write_failed" }, 500);
  }
}
