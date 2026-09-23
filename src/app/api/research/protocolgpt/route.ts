import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ methods?: string; title?: string }>({
  tool: "protocolgpt",
  prepare: (body) => {
    const methods = (body.methods ?? "").trim();
    if (methods.length < 15) return reject("paste a methods/SOP description (>= 15 chars)");
    return { methods, title: (body.title ?? "").trim() || undefined };
  },
});
