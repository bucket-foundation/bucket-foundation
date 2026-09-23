import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "materialsfeaturizer",
  prepare: (body) => {
    if (body.demo === true || isDemo(body.formula)) return body;
    const formula = typeof body.formula === "string" ? body.formula.trim() : "";
    if (!formula) return reject('enter a chemical formula (e.g. "Fe2O3"), or use demo');
    return body;
  },
});
