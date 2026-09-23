import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "patchseqml",
  prepareForm: (form) => {
    if (!form) return reject("expected multipart/form-data");
    const out = new FormData();
    const file = form.get("file");
    if (file && file instanceof File && file.size > 0) {
      out.append("file", file, file.name || "rec.abf");
    }
    out.append("mode", (form.get("mode") as string | null) ?? "sim");
    return out;
  },
});
