import type { NextRequest } from "next/server";
import { adultLearner, answer, readJson, unavailable } from "@/lib/research-os/advisors/gate";
import { matchAdvisors, MAX_RESULTS } from "@/lib/research-os/advisors/match";
import { statementBody } from "@/lib/research-os/advisors/project";
import { loadSpace, takeMatch } from "@/lib/research-os/advisors/store";
import { staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const MAX_BODY_BYTES = 200 * 1024;
const MAX_TEXT_CHARS = 150_000;

type Body = { text?: unknown; offset?: unknown; cap?: unknown };

async function post(req: NextRequest) {
  const who = await adultLearner(req);
  if (!who.ok) return who.res;
  const parsed = await readJson<Body>(req, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.res;
  const { text, offset, cap } = parsed.body ?? {};
  if (typeof text !== "string" || !text.trim()) return answer(400, { error: "invalid_request", message: "Send the text of your resume or statement." });
  if (text.length > MAX_TEXT_CHARS) return answer(413, { error: "too_large", message: "The text is longer than 150,000 characters." });
  const start = offset === undefined ? 0 : Number(offset);
  if (!Number.isInteger(start) || start < 0 || start >= MAX_RESULTS) return answer(400, { error: "invalid_request", message: `offset is a whole number below ${MAX_RESULTS}.` });
  if (cap !== undefined && cap !== null && cap !== 5) return answer(400, { error: "invalid_request", message: "cap is 5 or null." });
  try {
    if (start === 0 && !(await takeMatch(who.learnerId))) {
      return answer(429, { error: "rate_limited", message: "You reached today's match limit. Try again tomorrow." });
    }
    const space = await loadSpace();
    if (!space) return answer(503, { error: "not_loaded", message: "No advisor set is loaded yet." });
    const result = matchAdvisors(space.projector, space.profiles, statementBody(text), { offset: start, cap: cap === null ? null : 5 });
    if (!result.ok) return answer(422, { error: result.reason, message: "The text shares too few terms with advisor topics. Paste a longer statement." });
    return answer(200, { version: space.version, total: result.total, offset: result.offset, results: result.results });
  } catch (e) {
    return unavailable("match", e);
  }
}

export const POST = staffOnlyAtLaunch(post);
