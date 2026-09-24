import { NextResponse, type NextRequest } from "next/server";

export const NO_STORE = { "cache-control": "no-store" };

export function bad(status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: { ...NO_STORE, ...headers } });
}

export async function readBody(req: NextRequest, maxBytes: number): Promise<{ body?: unknown; error?: NextResponse }> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { error: bad(413, "Request body is too large.") };
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { error: bad(400, "Request body could not be read.") };
  }
  if (Buffer.byteLength(raw, "utf8") > maxBytes) return { error: bad(413, "Request body is too large.") };
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { error: bad(400, "Request body must be JSON.") };
  }
}

export function limitResponse(
  kind: "tutor" | "research agent",
  verdict: { scope: "user" | "global"; cap: number; retryAfterSeconds: number },
) {
  const error =
    verdict.scope === "user"
      ? `Daily ${kind} limit reached (${verdict.cap}). Try again after midnight UTC.`
      : `The ${kind} has reached today's limit for everyone. Try again after midnight UTC.`;
  return bad(429, error, { limit: verdict.cap, scope: verdict.scope }, { "retry-after": String(verdict.retryAfterSeconds) });
}
