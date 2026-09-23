import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "survivalfit",
  prepare: (body) => {
    const durations = body.durations;
    const demo = body.demo === true || isDemo(durations);
    if (!demo && !(Array.isArray(durations) && durations.length >= 2)) {
      return reject("durations must be a numeric array (length >= 2), or use demo");
    }
    return body;
  },
});
