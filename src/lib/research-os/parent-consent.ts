import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DEFAULT_FROM } from "@/lib/download/notify";

export type ParentAction = "decide" | "revoke";

export interface ParentToken {
  requestId: string;
  action: ParentAction;
  email: string;
  expiresAt: number;
}

export const DECIDE_TTL_MS = 7 * 86_400_000;
export const REVOKE_TTL_MS = 3 * 365 * 86_400_000;

export const CONTACT_SALT = process.env.RESEARCH_OS_HASH_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || "bucket";

export function consentSecret(): string {
  const s = process.env.PARENT_CONSENT_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!s) throw new Error("parent consent secret unset");
  return s;
}

const b64 = (b: Buffer) => b.toString("base64url");

function key(secret: string): Buffer {
  return createHash("sha256").update(`enc:${secret}`).digest();
}

function seal(text: string, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return b64(Buffer.concat([iv, c.getAuthTag(), body]));
}

function unseal(sealed: string, secret: string): string | null {
  try {
    const raw = Buffer.from(sealed, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function mac(payload: string, secret: string): string {
  return b64(createHmac("sha256", secret).update(payload).digest());
}

export function signParentToken(t: ParentToken, secret: string): string {
  const payload = b64(Buffer.from(JSON.stringify({ r: t.requestId, a: t.action, x: t.expiresAt, e: seal(t.email, secret) })));
  return `${payload}.${mac(payload, secret)}`;
}

export function verifyParentToken(token: string, secret: string, now = Date.now()): ParentToken | null {
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const want = Buffer.from(mac(payload, secret));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  let p: { r?: unknown; a?: unknown; x?: unknown; e?: unknown };
  try {
    p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof p.r !== "string" || (p.a !== "decide" && p.a !== "revoke") || typeof p.x !== "number" || typeof p.e !== "string") return null;
  if (p.x < now) return null;
  const email = unseal(p.e, secret);
  if (!email) return null;
  return { requestId: p.r, action: p.a, expiresAt: p.x, email };
}

export function isEmail(s: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s.trim());
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bucket.foundation").replace(/\/$/, "");
}

export function parentLink(token: string): string {
  return `${siteUrl()}/consent/parent?t=${encodeURIComponent(token)}`;
}

export const KEPT_DATA = [
  "Learning progress only: words and lessons studied, review history, streaks.",
  "Visible only to family groups you own in Bucket or Polingual.",
  "Never sold, never shared, never used for ads.",
];

async function send(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY unset");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: DEFAULT_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`consent email ${res.status}`);
}

export async function emailConsentRequest(to: string, decideToken: string): Promise<void> {
  await send(
    to,
    "Your child asked to save their progress on Bucket",
    [
      "A child who uses Bucket or Polingual entered this email as their parent's.",
      "With your approval we keep:",
      ...KEPT_DATA.map((l) => `- ${l}`),
      "",
      `Approve or decline here (link works for 7 days, once): ${parentLink(decideToken)}`,
      "",
      "If you did not expect this email, ignore it. Nothing is kept without your approval.",
    ].join("\n"),
  );
}

export async function emailConsentConfirmed(to: string, revokeToken: string): Promise<void> {
  await send(
    to,
    "You approved your child's Bucket progress",
    [
      "You approved keeping your child's learning progress on Bucket.",
      ...KEPT_DATA.map((l) => `- ${l}`),
      "",
      "To see their progress, create a family group in the app with this email and share the invite code with your child.",
      "",
      `To revoke consent and delete all of your child's data, open this link: ${parentLink(revokeToken)}`,
      "You can also reply to this email to ask for a copy or deletion.",
    ].join("\n"),
  );
}
