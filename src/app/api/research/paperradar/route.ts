import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ interests?: string; since_days?: number; limit?: number }>({
  tool: "paperradar",
  prepare: (body) => {
    const interests = (body.interests ?? "").trim();
    if (interests.length < 3) return reject("interests required");
    return { interests, since_days: body.since_days ?? 540, limit: body.limit ?? 12 };
  },
});
