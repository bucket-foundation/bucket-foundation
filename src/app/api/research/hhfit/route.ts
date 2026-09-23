import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ trace?: unknown; current_pa?: number; dt_ms?: number; stim_onset_ms?: number | null }>({
  tool: "hhfit",
  prepare: (body) => {
    const trace = body.trace ?? "demo";
    const isArray = Array.isArray(trace) && trace.length > 0;
    if (!isDemo(trace) && !isArray) return reject('trace must be a numeric array or the string "demo"');
    return {
      trace,
      current_pa: body.current_pa ?? 100.0,
      dt_ms: body.dt_ms ?? 0.1,
      stim_onset_ms: body.stim_onset_ms ?? null,
    };
  },
});
