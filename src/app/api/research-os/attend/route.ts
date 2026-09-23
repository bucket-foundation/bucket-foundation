import { answerAttend, parseAttendParams } from "@/lib/research-os/attention";
import { privateQueryFactors } from "@/lib/research-os/attention-db";
import { graphService } from "@/lib/research-os/db";
import { makeupSnapshot } from "@/lib/research-os/makeup";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "optional" }, async (req, ctx) => {
  const params = parseAttendParams(req.nextUrl.searchParams);
  if ("error" in params) return bad(params.status, params.error);
  const svc = graphService();
  const out = await answerAttend(params, ctx.learnerId, {
    snapshot: () => makeupSnapshot(svc),
    privateFactors: (slugs, snap, learnerId) => privateQueryFactors(svc, slugs, snap, learnerId),
  });
  if ("error" in out) return bad(out.status, out.error);
  return out;
});
