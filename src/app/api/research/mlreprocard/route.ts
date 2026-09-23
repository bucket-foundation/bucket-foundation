import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "mlreprocard",
  prepare: (body) => {
    const rec = body.record ?? "demo";
    if (body.demo === true || isDemo(rec)) return body;
    const isObject = typeof rec === "object" && rec !== null && !Array.isArray(rec);
    const isJsonStr = typeof rec === "string" && rec.trim().length >= 2;
    if (!isObject && !isJsonStr) return reject('provide an experiment record (JSON object or fields), or "demo"');
    return body;
  },
});
