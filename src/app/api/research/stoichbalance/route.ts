import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "stoichbalance",
  prepare: (body) => {
    const eq = typeof body.equation === "string" ? body.equation.trim() : "";
    const demo = body.demo === true || eq.toLowerCase() === "demo";
    if (!demo && eq.length < 3) return reject('enter a chemical equation (e.g. "H2 + O2 -> H2O"), or use demo');
    return body;
  },
});
