import type { NextRequest } from "next/server";
import { verifyLearnerIdentity } from "@/lib/research-os/db";
import { isStaff } from "@/lib/research-os/staff";
import { bad, readJson, withResearchOsRoute } from "@/lib/research-os/route";
import { answerAttempt, dueCards, openAttempt, issueAttempt, loadAttempt, loadCard, loadStats, rekeyCard, retireCard, writeCard } from "@/lib/research-os/work-quiz/db";
import { answerQuestion, issueQuestion, parseMode, type QuizDeps } from "@/lib/research-os/work-quiz/service";
import { loadWorkSources } from "@/lib/research-os/work-quiz/sources-server";
import { matchLearnItem } from "@/lib/research-os/work-quiz/learn-match";
import { learnAtoms } from "@/lib/research-os/work-quiz/learn-index-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deps: QuizDeps = {
  loadSources: async () => (await loadWorkSources()).sources,
  matchLearn: (text) => matchLearnItem(text, learnAtoms()),
  dueCards,
  issueAttempt,
  openAttempt,
  loadAttempt,
  answerAttempt,
  loadCard,
  writeCard,
  rekeyCard,
  retireCard,
};

async function staff(req: NextRequest): Promise<boolean> {
  return isStaff(await verifyLearnerIdentity(req));
}

export const GET = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  if (!(await staff(req))) return bad(404, "not_found");
  const params = new URL(req.url).searchParams;
  if (params.get("view") === "stats") {
    const [stats, sources] = await Promise.all([loadStats(learnerId, new Date()), loadWorkSources()]);
    return { stats, sources: sources.status, counts: { beads: sources.sources.beads.length, prs: sources.sources.prs.length, notes: sources.sources.notes.length } };
  }
  const mode = parseMode(params.get("mode") ?? "surprise");
  if (!mode) return bad(400, "bad_mode");
  return { ...(await issueQuestion(deps, learnerId, mode, new Date())) };
});

export const POST = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  if (!(await staff(req))) return bad(404, "not_found");
  const read = await readJson(req);
  if (!read.ok) return read.res;
  const out = await answerQuestion(deps, learnerId, read.value, new Date());
  if (out.status === "not_found") return bad(404, "attempt_not_found");
  if (out.status === "invalid") return bad(400, out.error);
  return { ...out.result };
});
