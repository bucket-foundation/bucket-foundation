import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import { parseClientEvent } from "@/lib/academy/events";
import { recordLearnEvent, type LearnEventStore } from "@/lib/academy/events-server";

export const MAX_EVENT_BYTES = 16_384;
const NO_STORE = { "cache-control": "no-store" };

export interface EventDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  store: () => LearnEventStore | null;
}

function reply(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function handleLearnEvent(req: NextRequest, deps: EventDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "events_unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_EVENT_BYTES) return reply({ error: "too_large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  const parsed = parseClientEvent(raw);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);

  try {
    const result = await recordLearnEvent(store, user.id, parsed.value);
    return reply({ ...result }, 200);
  } catch (err) {
    console.error("[academy/event] write failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}
