import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ claim?: string; papers?: string[]; limit?: number }>({
  tool: "reviewguard",
  prepare: (body) => {
    const claim = (body.claim ?? "").trim();
    if (claim.length < 8) return reject("claim required (>= 8 chars)");
    const papers = Array.isArray(body.papers)
      ? body.papers.map((p) => String(p).trim()).filter(Boolean).slice(0, 25)
      : [];
    return { claim, papers, limit: body.limit ?? 12 };
  },
});
