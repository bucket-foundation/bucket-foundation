import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ claim?: string; limit?: number }>({
  tool: "quantumbiorag",
  prepare: (body) => {
    const claim = (body.claim ?? "").trim();
    if (claim.length < 8) return reject("state a quantum-biology claim (>= 8 chars)");
    return { claim, limit: body.limit ?? 15 };
  },
});
