import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ sequence?: unknown }>({
  tool: "aggregatepredict",
  prepare: (body) => {
    const sequence = body.sequence ?? "demo";
    const ok = isDemo(sequence) || (typeof sequence === "string" && sequence.replace(/[^A-Za-z]/g, "").length >= 7);
    if (!ok) return reject('enter a protein sequence (>= 7 aa) or "demo"');
    return { sequence };
  },
});
