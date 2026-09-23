import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ sequence?: string; k?: number }>({
  tool: "rnafmembeds",
  prepare: (body) => {
    const sequence = (body.sequence ?? "").trim();
    if (sequence.length < 4) return reject("sequence required (>= 4 nt)");
    return { sequence, k: body.k ?? 3 };
  },
});
