import { NextResponse, type NextRequest } from "next/server";
import { consentRefusal, requireConsent } from "../consent";
import { verifyLearner } from "../db";
import { decideLearnWrite, readAgeBand } from "../learn-gate";

export const NO_STORE = { "cache-control": "private, no-store" };

export const answer = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: NO_STORE });

export async function adultLearner(req: NextRequest): Promise<{ ok: true; learnerId: string } | { ok: false; res: NextResponse }> {
  const learnerId = await verifyLearner(req);
  if (!learnerId) return { ok: false, res: answer(401, { error: "unauthorized", message: "Sign in to match advisors." }) };
  const consent = await requireConsent(learnerId, "workspace_tool");
  if (!consent.allowed) {
    const refusal = consentRefusal(consent);
    return { ok: false, res: answer(refusal.status, refusal.body as unknown as Record<string, unknown>) };
  }
  const band = await readAgeBand(learnerId);
  if (!band.ok) return { ok: false, res: answer(503, { error: "profile_unavailable", message: "Your profile could not be read." }) };
  const decision = decideLearnWrite(band.band);
  if (!decision.allowed) return { ok: false, res: answer(403, { error: decision.reason, message: "Advisor match is open to adults." }) };
  return { ok: true, learnerId };
}

export async function readJson<T>(req: NextRequest, maxBytes: number): Promise<{ ok: true; body: T } | { ok: false; res: NextResponse }> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) {
    return { ok: false, res: answer(413, { error: "too_large", message: `Send at most ${Math.floor(maxBytes / 1024)} KB.` }) };
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { ok: false, res: answer(413, { error: "too_large", message: `Send at most ${Math.floor(maxBytes / 1024)} KB.` }) };
  }
  try {
    return { ok: true, body: JSON.parse(raw) as T };
  } catch {
    return { ok: false, res: answer(400, { error: "invalid_json", message: "The body is not JSON." }) };
  }
}

export function unavailable(where: string, e: unknown): NextResponse {
  console.error(`[research-os/advisors/${where}]`, e instanceof Error ? e.message : String(e));
  return answer(503, { error: "unavailable", message: "Advisor data could not be read." });
}
