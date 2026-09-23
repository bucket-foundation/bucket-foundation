import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ trace?: unknown; fs_hz?: number; thresh_mad?: number }>({
  tool: "spikefeatures",
  prepare: (body) => {
    const trace = body.trace ?? "demo";
    const isArray = Array.isArray(trace) && trace.length > 0;
    if (!isDemo(trace) && !isArray) return reject('trace must be a numeric array or the string "demo"');
    return {
      trace,
      fs_hz: body.fs_hz ?? 30000.0,
      thresh_mad: body.thresh_mad ?? 5.0,
    };
  },
});
