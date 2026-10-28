import { forwardedClientIp, signClientIp } from "@academy/proxy-ip";

export const syncBase = () => (process.env.POLINGUAL_SYNC_BASE || "https://www.bucket.foundation").replace(/\/$/, "");

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

export const isProduction = () => process.env.VERCEL_ENV === "production" || (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

export async function proxySession(req: Request, deps: { base: string; secret: string | undefined; fetch: typeof fetch; now: number; production?: boolean; log?: (msg: string) => void }): Promise<Response> {
  if (!deps.secret && deps.production) {
    (deps.log ?? console.error)("polingual session proxy: POLINGUAL_PROXY_SECRET is unset in production; refusing to send sign-in unsigned");
    return new Response(JSON.stringify({ error: "sync_unavailable" }), { status: 503, headers: JSON_HEADERS });
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.authorization = auth;
  if (deps.secret) Object.assign(headers, signClientIp(forwardedClientIp(req.headers), deps.secret, deps.now));
  try {
    const r = await deps.fetch(`${deps.base}/api/academy/session`, { method: "POST", headers, body: await req.text(), cache: "no-store" });
    return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return new Response(JSON.stringify({ error: "offline" }), { status: 502, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
}
