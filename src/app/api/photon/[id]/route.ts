import { getPhoton } from "@/lib/photon-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const decoded = decodeURIComponent(id);
  const photon = getPhoton(decoded);
  if (!photon) {
    return new Response(
      JSON.stringify({ error: { code: "not_found", id: decoded } }),
      { status: 404, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } },
    );
  }
  return new Response(JSON.stringify(photon, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "x-bucket-photon": "v1",
    },
  });
}
