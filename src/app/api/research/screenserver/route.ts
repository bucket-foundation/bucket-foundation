import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute<{ smiles?: string }>({
  tool: "screenserver",
  timeoutMs: 20000,
  prepare: (body) => {
    const smiles = (body.smiles ?? "").trim();
    if (smiles.length < 1) return reject("enter at least one SMILES");
    return { smiles };
  },
});
