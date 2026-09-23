import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ topic?: string; limit?: number }>({
  tool: "grantdraft",
  prepare: (body) => {
    const topic = (body.topic ?? "").trim();
    if (topic.length < 4) return reject("topic required");
    return { topic, limit: body.limit ?? 8 };
  },
});
