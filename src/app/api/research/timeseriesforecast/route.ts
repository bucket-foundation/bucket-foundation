import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "timeseriesforecast",
  prepare: (body) => {
    const values = body.values;
    const demo = body.demo === true || isDemo(values);
    if (!demo && !(Array.isArray(values) && values.length >= 4)) {
      return reject("values must be a numeric array (length >= 4), or use demo");
    }
    return body;
  },
});
