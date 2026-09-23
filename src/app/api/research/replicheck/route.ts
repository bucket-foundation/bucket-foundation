import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ text?: unknown; alpha?: unknown; items?: unknown }>({
  tool: "replicheck",
  prepare: (body) => {
    const text = body.text ?? "demo";
    const ok = isDemo(text) || (typeof text === "string" && text.trim().length >= 8);
    if (!ok) return reject('paste a Results section with reported statistics, or use "demo"');
    const alpha = typeof body.alpha === "number" ? body.alpha : 0.05;
    const items = typeof body.items === "number" ? body.items : 1;
    return { text, alpha, items };
  },
});
