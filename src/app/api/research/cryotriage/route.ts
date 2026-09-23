import { toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "cryotriage",
  prepareForm: (form) => {
    const out = new FormData();
    const file = form?.get("file");
    if (file && file instanceof File && file.size > 0) {
      out.append("file", file, file.name || "mic.png");
    }
    return out;
  },
});
