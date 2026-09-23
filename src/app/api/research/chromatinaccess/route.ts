import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ sequence?: unknown }>({
  tool: "chromatinaccess",
  prepare: (body) => {
    const sequence = body.sequence ?? "demo";
    const ok = isDemo(sequence) || (typeof sequence === "string" && sequence.replace(/[^A-Za-z]/g, "").length >= 20);
    if (!ok) return reject('enter a DNA sequence (>= 20 nt) or "demo"');
    return { sequence };
  },
});
