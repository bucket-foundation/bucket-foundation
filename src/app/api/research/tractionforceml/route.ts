import { isDemo, reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ reference?: unknown; deformed?: number[][]; window?: number; step?: number; search?: number }>({
  tool: "tractionforceml",
  prepare: (body) => {
    const reference = body.reference ?? "demo";
    const isArray =
      Array.isArray(reference) && reference.length > 0 && Array.isArray(body.deformed) && body.deformed.length > 0;
    if (!isDemo(reference) && !isArray) return reject('provide reference + deformed images, or reference="demo"');
    return {
      reference,
      deformed: body.deformed ?? null,
      window: body.window ?? 16,
      step: body.step ?? 8,
      search: body.search ?? 8,
    };
  },
});
