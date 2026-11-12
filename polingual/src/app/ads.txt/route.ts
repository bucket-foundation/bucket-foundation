import { adsTxt } from "@/lib/lobby/ads";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const body = adsTxt(process.env.POLINGUAL_ADSENSE_PUB_ID);
  if (!body) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
