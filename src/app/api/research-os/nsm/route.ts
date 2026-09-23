import type { NextRequest } from "next/server";
import { bad, ok, withResearchOsRoute } from "@/lib/research-os/route";
import { loadNsm } from "@/lib/research-os/nsm-db";
import { CLICS_ATTRIBUTION, HIDE_BELOW, NSM_CITATION, UNCERTAIN_BELOW, parseLang } from "@/lib/research-os/nsm";
import { KAIKKI_ATTRIBUTION } from "@/lib/research-os/node-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none", failed: () => bad(503, "graph_read_failed") }, async (req: NextRequest) => {
  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  if (lang === undefined) return bad(400, "lang_invalid");
  const includeHidden = req.nextUrl.searchParams.get("hidden") === "1";
  const primes = await loadNsm({ lang, includeHidden });
  return ok({ primes, lang, hideBelow: HIDE_BELOW, uncertainBelow: UNCERTAIN_BELOW, includeHidden, citation: NSM_CITATION, attribution: KAIKKI_ATTRIBUTION, colexAttribution: CLICS_ATTRIBUTION });
});
