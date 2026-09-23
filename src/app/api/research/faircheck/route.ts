import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ record?: unknown }>({
  tool: "faircheck",
  prepare: (body) => {
    const record = body.record ?? "demo";
    const isObject = typeof record === "object" && record !== null && !Array.isArray(record);
    const isJsonStr = typeof record === "string" && record.trim().length >= 2;
    if (!isDemo(record) && !isObject && !isJsonStr) {
      return reject('provide a metadata record (JSON object or fields), or "demo"');
    }
    return { record };
  },
});
