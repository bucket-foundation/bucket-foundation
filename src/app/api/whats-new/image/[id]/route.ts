import { NextRequest, NextResponse } from "next/server";
import { handleImage } from "@/lib/whats-new/image";
import { getWhatsNewStore } from "@/lib/whats-new/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const SAFE = { "x-content-type-options": "nosniff", "cache-control": "public, max-age=0, must-revalidate" };

export async function GET(_req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const result = await handleImage(params.id, getWhatsNewStore());
  if (result.bytes === null) return new NextResponse(result.status === 404 ? "Not Found" : "Unavailable", { status: result.status, headers: { ...SAFE, "cache-control": "no-store" } });
  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: { ...SAFE, "content-type": "image/webp", "content-length": String(result.bytes.length), "content-disposition": "inline", "content-security-policy": "default-src 'none'" },
  });
}
