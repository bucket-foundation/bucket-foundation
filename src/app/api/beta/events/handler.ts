import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import { BETA_LIMITS, parseBatch } from "@/lib/beta/events";
import type { BetaStore } from "@/lib/beta/store";
import { secondsUntilUtcMidnight } from "@/lib/llm/daily-limit";

const NO_STORE = { "cache-control": "no-store" };

export interface BetaIngestDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  store: () => BetaStore | null;
  now?: () => Date;
}

function reply(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export async function handleBetaEvents(req: NextRequest, deps: BetaIngestDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "events_unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);
  const now = deps.now?.() ?? new Date();

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > BETA_LIMITS.maxBodyBytes) return reply({ error: "too_large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  const parsed = parseBatch(raw, now);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);
  const { app, events, rejected } = parsed.value;

  try {
    const tester = await store.tester(user.id, app);
    if (tester.optedOut) return reply({ accepted: 0, duplicate: 0, rejected, cohort: tester.cohort, opted_out: true }, 200);
    if (events.length === 0) return reply({ accepted: 0, duplicate: 0, rejected, cohort: tester.cohort }, 200);
    const result = await store.insert(user.id, app, events, BETA_LIMITS.dailyCap);
    if (result.outcome === "opted_out") return reply({ accepted: 0, duplicate: 0, rejected, cohort: tester.cohort, opted_out: true }, 200);
    if (result.outcome === "rate_limited") {
      const retry = secondsUntilUtcMidnight(now);
      return reply({ error: "rate_limited", cap: BETA_LIMITS.dailyCap, retryAfterSeconds: retry }, 429, { "retry-after": String(retry) });
    }
    return reply({ accepted: result.accepted, duplicate: events.length - result.accepted, rejected, cohort: tester.cohort }, 200);
  } catch (err) {
    console.error("[beta/events] write failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}

export async function handleBetaOptOut(req: NextRequest, deps: BetaIngestDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "events_unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  const optedOut = (body as { opted_out?: unknown } | null)?.opted_out;
  if (typeof optedOut !== "boolean") return reply({ error: "bad_request" }, 400);
  try {
    await store.setOptOut(user.id, optedOut);
    return reply({ opted_out: optedOut }, 200);
  } catch (err) {
    console.error("[beta/opt-out] write failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}
