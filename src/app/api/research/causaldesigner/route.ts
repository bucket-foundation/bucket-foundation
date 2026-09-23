import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "causaldesigner",
  prepare: (body) => {
    if (body.demo === true || isDemo(body.treatment)) return body;
    const treatment = typeof body.treatment === "string" ? body.treatment.trim() : "";
    const outcome = typeof body.outcome === "string" ? body.outcome.trim() : "";
    if (!treatment || !outcome) return reject("treatment and outcome are required (or use demo)");
    return body;
  },
});
