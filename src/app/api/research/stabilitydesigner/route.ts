import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ sequence?: string; mode?: string; mutation?: string; position?: number }>({
  tool: "stabilitydesigner",
  timeoutMs: 20000,
  prepare: (body) => {
    const sequence = (body.sequence ?? "").trim();
    const mode = (body.mode ?? "predict").trim();
    if (sequence.replace(/[^A-Za-z]/g, "").length < 5) return reject("sequence too short");
    if (mode === "predict" && !(body.mutation ?? "").trim()) return reject("mutation required (e.g. A23V)");
    if (mode === "scan" && !body.position) return reject("position required for scan");
    return {
      sequence,
      mode,
      mutation: (body.mutation ?? "").trim() || undefined,
      position: body.position ?? undefined,
    };
  },
});
