import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { deleteAccount } from "@/lib/academy/delete-account";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { bearerToken, clientIp, createSessionHandler } from "@/lib/academy/session-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let anon: SupabaseClient | null = null;
let bucket: SupabaseClient | null = null;
const anonClient = () => (anon ??= createClient(URL_(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", opts));
const bucketClient = () => (bucket ??= createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { ...opts, db: { schema: "bucket" } }) as unknown as SupabaseClient);

const adminClient = () => createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", opts);

const deleteAccountFor = (accessToken: string) =>
  deleteAccount(
    {
      getUser: async (token) => {
        const { data, error } = await anonClient().auth.getUser(token);
        return { id: error ? null : (data.user?.id ?? null), status: error ? (error.status ?? 500) : null };
      },
      deleteRows: async (table, userId) => ({ failed: Boolean((await bucketClient().from(table).delete().eq("user_id", userId)).error) }),
      deleteUser: async (userId) => {
        const { error } = await adminClient().auth.admin.deleteUser(userId);
        return { status: error ? (error.status ?? 500) : null };
      },
    },
    accessToken,
  );

const handle = createSessionHandler({
  enabled: () => process.env.ACADEMY_REVIEW_LOG === "on",
  configured: () => Boolean(URL_() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
  now: Date.now,
  rateHit: async (key, limit, windowSeconds) => {
    const { data, error } = await bucketClient().rpc("session_rate_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) throw new Error(`session rate: ${error.message}`);
    return data === true;
  },
  sendOtp: async (email, redirectTo) => {
    const { error } = await anonClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) } });
    return { status: error ? (error.status ?? 500) : null };
  },
  verifyOtp: async (email, code) => {
    const { data, error } = await anonClient().auth.verifyOtp({ type: "email", email, token: code });
    return { session: error ? null : data.session, status: error ? (error.status ?? 500) : null };
  },
  refresh: async (refreshToken) => {
    const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken });
    return { session: error ? null : data.session, status: error ? (error.status ?? 500) : null };
  },
  signInWithApple: async (token, nonce) => {
    const { data, error } = await anonClient().auth.signInWithIdToken({ provider: "apple", token, nonce });
    return { session: error ? null : data.session, status: error ? (error.status ?? 500) : null };
  },
  deleteAccount: deleteAccountFor,
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const r = await handle(await readJson(req), clientIp(req.headers), bearerToken(req.headers));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("academy session", e);
    return jsonResponse({ error: "session_failed" }, 502);
  }
}
