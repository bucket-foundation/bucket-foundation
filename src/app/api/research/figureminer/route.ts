import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ text?: unknown }>({
  tool: "figureminer",
  prepare: (body) => {
    const text = body.text ?? "demo";
    const ok = isDemo(text) || (typeof text === "string" && text.trim().length >= 20);
    if (!ok) return reject('paste paper text (>= 20 chars) or use "demo"');
    return { text };
  },
});
