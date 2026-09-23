import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ author?: string; question?: string }>({
  tool: "labbrain",
  timeoutMs: 20000,
  prepare: (body) => {
    const author = (body.author ?? "").trim();
    const question = (body.question ?? "").trim();
    if (author.length < 2) return reject("author required");
    if (question.length < 5) return reject("question too short");
    return { author, question };
  },
});
