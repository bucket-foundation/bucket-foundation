import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import { loadAllHanComponents } from "@/lib/research-os/han-components-db";
import { EXPORT_PARTS, exportCsv, type ExportPart } from "@/lib/research-os/han-components";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none", failed: () => bad(503, "graph_read_failed") }, async (req) => {
  const part = (req.nextUrl.searchParams.get("part") || "").trim();
  if (!part) {
    return {
      files: (Object.keys(EXPORT_PARTS) as ExportPart[]).map((p) => ({
        part: p,
        file: EXPORT_PARTS[p].file,
        license: EXPORT_PARTS[p].header,
        href: `/api/research-os/han-components/export?part=${p}`,
      })),
    };
  }
  if (!(part in EXPORT_PARTS)) return bad(400, "part_unknown");
  const csv = exportCsv(part as ExportPart, await loadAllHanComponents());
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${EXPORT_PARTS[part as ExportPart].file}"`,
    },
  });
});
