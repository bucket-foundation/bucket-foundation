import { isProduction, proxySession, syncBase } from "@/lib/app/session-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return proxySession(req, { base: syncBase(), secret: process.env.POLINGUAL_PROXY_SECRET, fetch, now: Date.now(), production: isProduction() });
}
