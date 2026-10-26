import { NextResponse } from "next/server";
import { pixelIds } from "@/lib/ads";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(pixelIds(process.env), { headers: { "cache-control": "s-maxage=300" } });
}
