import { createHmac, timingSafeEqual } from "node:crypto";

export const PROXY_IP_HEADER = "x-polingual-client-ip";
export const PROXY_TS_HEADER = "x-polingual-ts";
export const PROXY_SIG_HEADER = "x-polingual-sig";
export const PROXY_MAX_SKEW_S = 300;
const IP_RE = /^[0-9A-Fa-f:.]{2,45}$/;

function mac(secret: string, ts: string, ip: string): string {
  return createHmac("sha256", secret).update(`${ts}.${ip}`).digest("hex");
}

export function signClientIp(ip: string, secret: string, nowMs: number): Record<string, string> {
  const ts = String(Math.floor(nowMs / 1000));
  return { [PROXY_IP_HEADER]: ip, [PROXY_TS_HEADER]: ts, [PROXY_SIG_HEADER]: mac(secret, ts, ip) };
}

export function verifiedProxyIp(headers: Headers, secret: string | undefined, nowMs: number): string | null {
  if (!secret) return null;
  const ip = headers.get(PROXY_IP_HEADER)?.trim() ?? "";
  const ts = headers.get(PROXY_TS_HEADER)?.trim() ?? "";
  const sig = headers.get(PROXY_SIG_HEADER)?.trim() ?? "";
  if (!IP_RE.test(ip) || !/^\d{1,12}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  if (Math.abs(nowMs / 1000 - Number(ts)) > PROXY_MAX_SKEW_S) return null;
  const want = Buffer.from(mac(secret, ts, ip), "hex");
  const got = Buffer.from(sig, "hex");
  return want.length === got.length && timingSafeEqual(want, got) ? ip : null;
}

export function forwardedClientIp(headers: Headers): string {
  const platform = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  if (platform) return platform;
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
