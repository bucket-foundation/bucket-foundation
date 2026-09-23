import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ toxin?: string; limit?: number }>({
  tool: "toxinchannelfinder",
  prepare: (body) => {
    const toxin = (body.toxin ?? "").trim();
    if (toxin.length < 3) return reject("enter a toxin/peptide name or sequence (>= 3 chars)");
    return { toxin, limit: body.limit ?? 10 };
  },
});
