import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse, readJson } from "@/lib/academy/device-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

function tokens(s: { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user?: { id: string } }) {
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600), user_id: s.user?.id ?? null };
}

export async function POST(req: NextRequest): Promise<Response> {
  if (process.env.ACADEMY_REVIEW_LOG !== "on") return jsonResponse({ error: "review_log_disabled" }, 503);
  const sb = anon();
  if (!sb) return jsonResponse({ error: "sync_unavailable" }, 503);
  const b = (await readJson(req)) as { action?: unknown; email?: unknown; code?: unknown; refresh_token?: unknown } | null;
  const email = typeof b?.email === "string" ? b.email.trim() : "";
  try {
    if (b?.action === "otp") {
      if (!EMAIL_RE.test(email)) return jsonResponse({ error: "bad_email" }, 400);
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) return jsonResponse({ error: error.status === 429 ? "too_many_requests" : "send_failed" }, error.status === 429 ? 429 : 400);
      return jsonResponse({ ok: true });
    }
    if (b?.action === "verify") {
      const code = typeof b.code === "string" ? b.code.trim() : "";
      if (!EMAIL_RE.test(email) || !/^\d{6,10}$/.test(code)) return jsonResponse({ error: "bad_code" }, 400);
      const { data, error } = await sb.auth.verifyOtp({ type: "email", email, token: code });
      if (error || !data.session) return jsonResponse({ error: "bad_code" }, 400);
      return jsonResponse(tokens(data.session));
    }
    if (b?.action === "refresh") {
      const rt = typeof b.refresh_token === "string" ? b.refresh_token : "";
      if (!rt) return jsonResponse({ error: "bad_request" }, 400);
      const { data, error } = await sb.auth.refreshSession({ refresh_token: rt });
      if (error && (error.status ?? 500) >= 500) return jsonResponse({ error: "refresh_failed" }, 502);
      if (error || !data.session) return jsonResponse({ error: "revoked" }, 401);
      return jsonResponse(tokens(data.session));
    }
    return jsonResponse({ error: "bad_request" }, 400);
  } catch (e) {
    console.error("academy session", e);
    return jsonResponse({ error: "session_failed" }, 502);
  }
}
