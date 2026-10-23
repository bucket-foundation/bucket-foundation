import { parseSignup } from "./signup";

export const TESTFLIGHT_URL = "https://testflight.apple.com/join/HfeRBKr8";

export type BetaEnv = Record<string, string | undefined>;
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type BetaResult = { status: number; body: { ok?: true; error?: string; testflight?: string } };

const API = "https://api.resend.com";

export function welcomeEmail(to: string, from: string) {
  return {
    from,
    to: [to],
    subject: "Your Polingual beta link",
    text: `Thanks for joining the Polingual beta.\n\nInstall it on your iPhone through TestFlight:\n${TESTFLIGHT_URL}\n\nReply to this email with the languages you speak and the ones you want next.\n\nPolingual`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#231F20"><p>Thanks for joining the Polingual beta.</p><p><a href="${TESTFLIGHT_URL}" style="display:inline-block;background:#D9381E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Install with TestFlight</a></p><p>Reply with the languages you speak and the ones you want next.</p><p>Polingual</p></div>`,
  };
}

export async function joinBeta(body: unknown, env: BetaEnv, send: Fetcher = fetch): Promise<BetaResult> {
  const parsed = parseSignup(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.suspect) return { status: 200, body: { ok: true, testflight: TESTFLIGHT_URL } };
  const key = env.RESEND_API_KEY?.trim();
  const audience = env.RESEND_BETA_AUDIENCE_ID?.trim();
  if (!key || !audience) return { status: 503, body: { error: "Signups are offline. Try again soon." } };
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const contact = await send(`${API}/audiences/${audience}/contacts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: parsed.signup.email, unsubscribed: false }),
  });
  if (!contact.ok && contact.status !== 409) return { status: 502, body: { error: "Your signup did not save. Try again in a minute." } };
  const from = env.BETA_FROM?.trim() || "Polingual <hello@bucket.foundation>";
  const mail = await send(`${API}/emails`, { method: "POST", headers, body: JSON.stringify(welcomeEmail(parsed.signup.email, from)) });
  if (!mail.ok) console.error("[beta] welcome email failed", mail.status);
  return { status: 200, body: { ok: true, testflight: TESTFLIGHT_URL } };
}
