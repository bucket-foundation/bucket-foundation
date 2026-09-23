import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ paper?: string; limit?: number }>({
  tool: "citationgraph",
  prepare: (body) => {
    const paper = (body.paper ?? "").trim();
    if (paper.length < 4) return reject("enter a DOI, OpenAlex ID, or paper title");
    return { paper, limit: body.limit ?? 15 };
  },
});
