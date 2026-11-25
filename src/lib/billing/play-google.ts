import { importPKCS8, jwtVerify, SignJWT, type JWTVerifyGetKey } from "jose";
import { GOOGLE_ISSUERS } from "../academy/google-token";
import type { PlayGoogle, PlayKind } from "./play";

const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
}

export function serviceAccount(raw: string | undefined): ServiceAccount | null {
  const text = raw?.trim();
  if (!text) return null;
  for (const candidate of [text, Buffer.from(text, "base64").toString("utf8")]) {
    try {
      const j = JSON.parse(candidate) as Partial<ServiceAccount>;
      if (typeof j.client_email === "string" && typeof j.private_key === "string") return j as ServiceAccount;
    } catch {
      continue;
    }
  }
  return null;
}

export function googlePlayClient(sa: ServiceAccount, apiBase: string, fetcher: typeof fetch = fetch): PlayGoogle {
  let cached: { token: string; until: number } | null = null;
  async function accessToken(): Promise<string> {
    if (cached && cached.until > Date.now() + 60_000) return cached.token;
    const key = await importPKCS8(sa.private_key, "RS256");
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) })
      .setIssuer(sa.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    const res = await fetcher(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
    });
    if (!res.ok) throw new Error(`google token ${res.status}`);
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) throw new Error("google token missing");
    cached = { token: j.access_token, until: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return j.access_token;
  }
  const base = `${apiBase.replace(/\/$/, "")}/androidpublisher/v3/applications`;
  const e = encodeURIComponent;
  async function get(url: string): Promise<Record<string, unknown> | null> {
    const res = await fetcher(url, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (res.status === 404 || res.status === 410 || res.status === 400) return null;
    if (!res.ok) throw new Error(`androidpublisher ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  }
  return {
    subscription: (pkg, token) => get(`${base}/${e(pkg)}/purchases/subscriptionsv2/tokens/${e(token)}`),
    product: (pkg, productId, token) => get(`${base}/${e(pkg)}/purchases/products/${e(productId)}/tokens/${e(token)}`),
    acknowledge: async (pkg: string, kind: PlayKind, productId: string, token: string) => {
      const path = kind === "subs" ? "subscriptions" : "products";
      const res = await fetcher(`${base}/${e(pkg)}/purchases/${path}/${e(productId)}/tokens/${e(token)}:acknowledge`, {
        method: "POST",
        headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
        body: "{}",
      });
      return res.ok;
    },
  };
}

export async function verifyPubSubToken(
  authorization: string | null,
  opts: { audience: string; email: string; keys: JWTVerifyGetKey; now: number },
): Promise<boolean> {
  const m = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!m || !opts.audience || !opts.email) return false;
  try {
    const { payload } = await jwtVerify(m[1].trim(), opts.keys, {
      issuer: GOOGLE_ISSUERS,
      audience: opts.audience,
      algorithms: ["RS256"],
      currentDate: new Date(opts.now),
    });
    if (payload.email !== opts.email || payload.email_verified !== true) return false;
    return true;
  } catch {
    return false;
  }
}

export interface RtdnConfig {
  audience: string;
  email: string;
}

export function rtdnConfig(env: Record<string, string | undefined>): RtdnConfig | null {
  const audience = env.PLAY_RTDN_AUDIENCE?.trim() ?? "";
  const email = env.PLAY_RTDN_SERVICE_ACCOUNT?.trim() ?? "";
  return audience && email ? { audience, email } : null;
}
