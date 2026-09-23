import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ z?: unknown; force?: number[]; radius_nm?: number; geometry?: string }>({
  tool: "afmcurveml",
  prepare: (body) => {
    const z = body.z ?? "demo";
    const isArray = Array.isArray(z) && z.length > 0 && Array.isArray(body.force) && body.force.length > 0;
    if (!isDemo(z) && !isArray) return reject('provide z + force arrays, or z="demo"');
    if (body.geometry && body.geometry !== "sphere" && body.geometry !== "cone") {
      return reject("geometry must be 'sphere' or 'cone'");
    }
    return {
      z,
      force: body.force ?? null,
      radius_nm: body.radius_nm ?? 1000.0,
      geometry: body.geometry ?? "sphere",
    };
  },
});
