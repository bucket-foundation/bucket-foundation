import { NextResponse } from "next/server";
import { issuerProfile } from "@/lib/academy/credential/issuer";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET(): NextResponse {
  return new NextResponse(JSON.stringify(issuerProfile(), null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600",
    },
  });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
