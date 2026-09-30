import { NextRequest, NextResponse } from "next/server";
import { consentRefusal, requireConsent } from "@/lib/research-os/consent";
import { graphService, verifyLearner } from "@/lib/research-os/db";
import { dailyToolCap, dailyCapMessage, recordAndCheck } from "@/lib/research-os/rate-limit";
import { decideGate, flagOn, pilotIds, ProfileUnavailable, readBirthYearBucket } from "@/lib/research-os/evidence-search/gate";
import { CorpusReadFailed, CorpusUnavailable, EligibilityUnavailable, loadCorpus, runEvidenceSearch, workerFromEnv } from "@/lib/research-os/evidence-search/server";
import { MAX_BODY_BYTES, parseSearchRequest } from "@/lib/research-os/evidence-search/types";
import { staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };

function answer(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function gate(req: NextRequest): Promise<{ ok: true; learnerId: string } | { ok: false; res: NextResponse }> {
  if (!flagOn(process.env.RESEARCH_OS_AI_SEARCH)) {
    return { ok: false, res: answer(404, { error: "feature_off", message: "Evidence search is off." }) };
  }
  const learnerId = await verifyLearner(req);
  if (!learnerId) return { ok: false, res: answer(401, { error: "no_session", message: "Sign in to search public evidence." }) };
  const consent = await requireConsent(learnerId, "workspace_tool");
  if (!consent.allowed) {
    const refusal = consentRefusal(consent);
    return { ok: false, res: answer(refusal.status, refusal.body as unknown as Record<string, unknown>) };
  }
  let band;
  try {
    band = await readBirthYearBucket(graphService(), learnerId);
  } catch (e) {
    if (e instanceof ProfileUnavailable) {
      return { ok: false, res: answer(503, { error: "profile_unavailable", message: "Your profile could not be read; search is off for the moment." }) };
    }
    throw e;
  }
  const decision = decideGate({
    flagOn: true,
    pilotIds: pilotIds(process.env.RESEARCH_OS_AI_SEARCH_PILOT_IDS),
    learnerId,
    consentAllowed: true,
    birthYearBucket: band,
  });
  if (!decision.ok) return { ok: false, res: answer(decision.status, { error: decision.error, message: decision.message }) };
  return { ok: true, learnerId };
}

async function get(req: NextRequest) {
  const allowed = await gate(req);
  if (!allowed.ok) return allowed.res;
  try {
    const corpus = loadCorpus();
    return answer(200, { available: true, corpusRevision: corpus.revision, sources: corpus.records.size, worker: workerFromEnv() !== null });
  } catch (e) {
    if (e instanceof CorpusReadFailed) return answer(503, { error: "corpus_read_failed", message: "The evidence corpus could not be read this minute. Try again in a moment." });
    if (e instanceof CorpusUnavailable) return answer(503, { error: "corpus_unavailable", message: "The evidence corpus is not ready on this server." });
    throw e;
  }
}

async function post(req: NextRequest) {
  const allowed = await gate(req);
  if (!allowed.ok) return allowed.res;
  const learnerId = allowed.learnerId;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return answer(413, { error: "too_large", message: `The request is at most ${MAX_BODY_BYTES} bytes.` });
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return answer(413, { error: "too_large", message: `The request is at most ${MAX_BODY_BYTES} bytes.` });
    body = JSON.parse(text);
  } catch {
    return answer(400, { error: "invalid_request", message: "The body is JSON." });
  }
  const parsed = parseSearchRequest(body);
  if (!parsed.ok) return answer(parsed.status, { error: "invalid_request", message: parsed.message });

  const cap = recordAndCheck(learnerId, dailyToolCap());
  if (!cap.allowed) return answer(429, { error: "rate_limited", message: dailyCapMessage(cap.cap) });

  const requestId = crypto.randomUUID();
  try {
    const corpus = loadCorpus();
    const response = await runEvidenceSearch({ corpus, svc: graphService(), worker: workerFromEnv(), requestId }, parsed.value);
    return answer(200, response as unknown as Record<string, unknown>);
  } catch (e) {
    if (e instanceof CorpusReadFailed) return answer(503, { error: "corpus_read_failed", message: "The evidence corpus could not be read this minute. Try again in a moment." });
    if (e instanceof CorpusUnavailable) return answer(503, { error: "corpus_unavailable", message: "The evidence corpus is not ready on this server." });
    if (e instanceof EligibilityUnavailable) return answer(503, { error: "eligibility_unavailable", message: "The list of admitted sources could not be read; search is off for the moment." });
    throw e;
  }
}

export const POST = staffOnlyAtLaunch(post);
export const GET = staffOnlyAtLaunch(get);
