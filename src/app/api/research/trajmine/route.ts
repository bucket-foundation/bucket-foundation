import { toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ demo?: string }>({
  tool: "trajmine",
  invalidJson: "empty",
  prepare: (body) => ({ demo: (body.demo ?? "md").trim() || "md" }),
});
