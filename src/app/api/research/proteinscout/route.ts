import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ input?: string }>({
  tool: "proteinscout",
  timeoutMs: 20000,
  prepare: (body) => {
    const input = (body.input ?? "").trim();
    if (input.length < 1) return reject("input required");
    return { input };
  },
});
