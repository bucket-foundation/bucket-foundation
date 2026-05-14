// GET /api/photon/:id — proxy to the polingual.photons table on
// db.agfarms.dev. Returns a single Photon JSON or 404.

import { NextResponse } from "next/server";
import { getPhoton } from "@/lib/photon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const decoded = decodeURIComponent(id);
  const photon = await getPhoton(decoded);
  if (!photon) {
    return NextResponse.json({ error: "not_found", id: decoded }, { status: 404 });
  }
  return NextResponse.json(photon, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
}
