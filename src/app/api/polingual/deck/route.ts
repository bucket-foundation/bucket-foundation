import type { NextRequest } from "next/server";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { deckHandlerFor as handlerFor } from "@/lib/polingual/deck-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const r = await handlerFor(req).save(await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual deck save", e);
    return jsonResponse({ error: "save_failed" }, 502);
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const r = await handlerFor(req).list(new URL(req.url).searchParams.get("deck"));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual deck list", e);
    return jsonResponse({ error: "read_failed" }, 502);
  }
}
