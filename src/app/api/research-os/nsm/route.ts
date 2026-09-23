import { NextRequest, NextResponse } from "next/server";
import { configured } from "@/lib/research-os/db";
import { loadNsm } from "@/lib/research-os/nsm-db";
import { HIDE_BELOW, NSM_CITATION, UNCERTAIN_BELOW, parseLang } from "@/lib/research-os/nsm";
import { KAIKKI_ATTRIBUTION } from "@/lib/research-os/node-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  if (lang === undefined) return bad(400, "lang_invalid");
  const includeHidden = req.nextUrl.searchParams.get("hidden") === "1";
  try {
    const primes = await loadNsm({ lang, includeHidden });
    return NextResponse.json(
      { primes, lang, hideBelow: HIDE_BELOW, uncertainBelow: UNCERTAIN_BELOW, includeHidden, citation: NSM_CITATION, attribution: KAIKKI_ATTRIBUTION },
      NO_STORE,
    );
  } catch (err) {
    console.error("[research-os/nsm] read failed:", err instanceof Error ? err.message : err);
    return bad(503, "graph_read_failed");
  }
}
