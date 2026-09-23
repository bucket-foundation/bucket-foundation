import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ trace?: unknown; fs_hz?: number }>({
  tool: "channeldwell",
  prepare: (body) => {
    const trace = body.trace ?? "demo";
    const isArray = Array.isArray(trace) && trace.length > 0;
    if (!isDemo(trace) && !isArray) return reject('trace must be a numeric array or the string "demo"');
    return {
      trace,
      fs_hz: body.fs_hz ?? 10000.0,
    };
  },
});
