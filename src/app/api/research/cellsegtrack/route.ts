import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ image?: unknown; min_distance?: number; sigma?: number }>({
  tool: "cellsegtrack",
  prepare: (body) => {
    const image = body.image ?? "demo";
    const isArray = Array.isArray(image) && image.length > 0;
    if (!isDemo(image) && !isArray) return reject('image must be a 2-D array or the string "demo"');
    return { image, min_distance: body.min_distance ?? 5, sigma: body.sigma ?? 1.0 };
  },
});
