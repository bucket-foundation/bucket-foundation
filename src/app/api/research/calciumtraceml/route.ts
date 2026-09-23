import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ trace?: unknown; fs_hz?: number; baseline_window_s?: number; thresh_mad?: number }>({
  tool: "calciumtraceml",
  prepare: (body) => {
    const trace = body.trace ?? "demo";
    const isArray = Array.isArray(trace) && trace.length > 0;
    if (!isDemo(trace) && !isArray) return reject('trace must be a numeric array or the string "demo"');
    return {
      trace,
      fs_hz: body.fs_hz ?? 30.0,
      baseline_window_s: body.baseline_window_s ?? 3.0,
      thresh_mad: body.thresh_mad ?? 3.0,
    };
  },
});
