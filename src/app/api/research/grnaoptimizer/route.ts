import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ sequence?: string; pam?: string; guide_len?: number; limit?: number }>({
  tool: "grnaoptimizer",
  prepare: (body) => {
    const sequence = (body.sequence ?? "").trim();
    if (sequence.length < 23) return reject("target DNA too short (need ~23 nt)");
    return {
      sequence,
      pam: (body.pam ?? "NGG").trim() || "NGG",
      guide_len: body.guide_len ?? 20,
      limit: body.limit ?? 20,
    };
  },
});
