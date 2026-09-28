import type { NextRequest } from "next/server";
import { adultLearner, answer, readJson, unavailable } from "@/lib/research-os/advisors/gate";
import { clearSwipes, DECISIONS, listSwipes, loadSpace, OPENALEX_ID, putSwipe, type Decision } from "@/lib/research-os/advisors/store";
import { staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function get(req: NextRequest) {
  const who = await adultLearner(req);
  if (!who.ok) return who.res;
  try {
    const [swipes, space] = await Promise.all([listSwipes(who.learnerId), loadSpace()]);
    const byId = new Map((space?.profiles ?? []).map((p) => [p.openalexId, p]));
    const rows = swipes.map((s) => {
      const p = byId.get(s.openalexId);
      return {
        ...s,
        profile: p ? { name: p.name, institution: p.institution, country: p.country, field: p.field, topics: p.topics, links: p.links } : null,
      };
    });
    return answer(200, { swipes: rows });
  } catch (e) {
    return unavailable("swipes", e);
  }
}

type PutBody = { openalexId?: unknown; decision?: unknown };

async function put(req: NextRequest) {
  const who = await adultLearner(req);
  if (!who.ok) return who.res;
  const parsed = await readJson<PutBody>(req, 2048);
  if (!parsed.ok) return parsed.res;
  const { openalexId, decision } = parsed.body ?? {};
  if (typeof openalexId !== "string" || !OPENALEX_ID.test(openalexId)) return answer(400, { error: "invalid_request", message: "openalexId looks like A123." });
  if (decision !== null && !(DECISIONS as readonly unknown[]).includes(decision)) {
    return answer(400, { error: "invalid_request", message: "decision is yes, no, maybe or null." });
  }
  try {
    await putSwipe(who.learnerId, openalexId, decision as Decision | null);
    return answer(200, { openalexId, decision });
  } catch (e) {
    return unavailable("swipes", e);
  }
}

async function del(req: NextRequest) {
  const who = await adultLearner(req);
  if (!who.ok) return who.res;
  try {
    await clearSwipes(who.learnerId);
    return answer(200, { cleared: true });
  } catch (e) {
    return unavailable("swipes", e);
  }
}

export const GET = staffOnlyAtLaunch(get);
export const PUT = staffOnlyAtLaunch(put);
export const DELETE = staffOnlyAtLaunch(del);
