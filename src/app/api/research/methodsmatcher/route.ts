import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ question?: string }>({
  tool: "methodsmatcher",
  prepare: (body) => {
    const question = (body.question ?? "").trim();
    if (question.length < 8) return reject("ask a research question (>= 8 chars)");
    return { question };
  },
});
