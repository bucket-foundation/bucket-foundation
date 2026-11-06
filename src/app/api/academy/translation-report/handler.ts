import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import { forwardedClientIp } from "@/lib/academy/proxy-ip";
import { MAX_REPORT_BYTES, parseTranslationReport, recordTranslationReport, type TranslationReportStore } from "@/lib/academy/translation-report";

const NO_STORE = { "cache-control": "no-store" };

export interface TranslationReportDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  store: () => TranslationReportStore | null;
}

function reply(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export async function handleTranslationReport(req: NextRequest, deps: TranslationReportDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "reports_unavailable" }, 503);

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_REPORT_BYTES) return reply({ error: "too_large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  const parsed = parseTranslationReport(raw);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);

  const hasBearer = /^Bearer\s+\S/i.test(req.headers.get("authorization") ?? "");
  const user = hasBearer ? await deps.verifyUser(req) : null;
  if (hasBearer && !user) return reply({ error: "unauthorized" }, 401);

  try {
    const result = await recordTranslationReport(store, parsed.value, { userId: user?.id ?? null, ip: forwardedClientIp(req.headers) });
    if (result.outcome === "anonymous_needs_device") return reply({ error: "device_required" }, 400);
    if (result.outcome === "rate_limited") return reply({ error: "rate_limited" }, 429, { "retry-after": String(result.retryAfterSeconds) });
    return reply({ ok: true, outcome: result.outcome }, 200);
  } catch (err) {
    console.error("[academy/translation-report] write failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}
