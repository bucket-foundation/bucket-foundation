import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import { parseClientBatch, parseClientEvent } from "@/lib/academy/events";
import { recordLearnBatch, recordLearnEvent, type LearnEventStore } from "@/lib/academy/events-server";

export const MAX_EVENT_BYTES = 16_384;
export const MAX_BATCH_BYTES = 262_144;
const NO_STORE = { "cache-control": "no-store" };

export interface EventDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  store: () => LearnEventStore | null;
}

function reply(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export async function handleLearnEvent(req: NextRequest, deps: EventDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "events_unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);

  const text = await req.text();
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > MAX_BATCH_BYTES) return reply({ error: "too_large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return bytes > MAX_EVENT_BYTES ? reply({ error: "too_large" }, 413) : reply({ error: "bad_request" }, 400);
  }
  if (raw && typeof raw === "object" && "events" in raw) {
    const batch = parseClientBatch(raw);
    if (!batch.ok) return reply({ error: batch.error }, 400);
    try {
      return reply({ ...(await recordLearnBatch(store, user.id, batch.value)) }, 200);
    } catch (err) {
      console.error("[academy/event] batch write failed:", err instanceof Error ? err.message : err);
      return reply({ error: "write_failed" }, 500);
    }
  }
  if (bytes > MAX_EVENT_BYTES) return reply({ error: "too_large" }, 413);
  const parsed = parseClientEvent(raw);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);

  try {
    const result = await recordLearnEvent(store, user.id, parsed.value);
    if (result.outcome === "rate_limited") {
      return reply({ error: "rate_limited", ...result }, 429, { "retry-after": String(result.retryAfterSeconds) });
    }
    return reply({ ...result }, 200);
  } catch (err) {
    console.error("[academy/event] write failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}
