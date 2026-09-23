import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "geosummary",
  prepare: (body) => {
    const demo = body.demo === true || isDemo(body.values);
    if (!demo && !(Array.isArray(body.values) && body.values.length > 0)) {
      return reject("values must be a non-empty numeric array, or use demo");
    }
    return body;
  },
});
