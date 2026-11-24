import type { NextRequest } from "next/server";
import { createClient, type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { exchangeAppleCode, revokeForAccountDelete } from "@/lib/academy/apple-token";
import { appleTokenDeps } from "@/lib/academy/apple-token-store";
import { vercelDefer } from "@/lib/capture/legs";
import { deleteAccount } from "@/lib/academy/delete-account";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { GOOGLE_SUB_KEY, googleClientId, googleKeys, mintGoogleSession, verifyGoogleIdToken } from "@/lib/academy/google-token";
import { findUserByEmail, isMissingRpc, mintReviewSession, reviewDemoConfig, rpcLookupWithFallback } from "@/lib/academy/review-demo";
import { appleAudiences, bearerToken, createSessionHandler, sessionClientIp } from "@/lib/academy/session-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let anon: SupabaseClient | null = null;
let bucket: SupabaseClient | null = null;
const anonClient = () => (anon ??= createClient(URL_(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", opts));
const bucketClient = () => (bucket ??= createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { ...opts, db: { schema: "bucket" } }) as unknown as SupabaseClient);

const adminClient = () => createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", opts);

const appleTokens = appleTokenDeps();

const lookupUser = (label: string) =>
  rpcLookupWithFallback(
    async (email) => {
      const { data, error } = await bucketClient().rpc("auth_user_by_email", { p_email: email });
      return { data, error: error ? { code: error.code, message: error.message } : null };
    },
    async (page, perPage) => {
      const { data, error } = await adminClient().auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(`${label} user list failed with status ${error.status}`);
      return data.users;
    },
    label,
  );

const deleteAccountFor = (accessToken: string) =>
  deleteAccount(
    {
      getUser: async (token) => {
        const { data, error } = await anonClient().auth.getUser(token);
        return { id: error ? null : (data.user?.id ?? null), status: error ? (error.status ?? 500) : null };
      },
      deleteRows: async (table, userId) => ({ failed: Boolean((await bucketClient().from(table).delete().eq("user_id", userId)).error) }),
      deleteLobbyData: async (userId) => ({ failed: Boolean((await bucketClient().rpc("delete_lobby_user", { p_user: userId })).error) }),
      revokeApple: (userId) => revokeForAccountDelete(appleTokens, userId),
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
  linkAppleCode: async (userId, app, code) => {
    await exchangeAppleCode(appleTokens, userId, app, code);
  },
  defer: vercelDefer,
  appleAudiences: () => appleAudiences(process.env.APPLE_AUDIENCES),
  google: {
    clientId: () => googleClientId(process.env.POLINGUAL_GOOGLE_WEB_CLIENT_ID),
    verify: (token, nonce, clientId) => verifyGoogleIdToken(token, nonce, { clientId, keys: googleKeys(), now: Date.now() }),
    signIn: (who) =>
      mintGoogleSession(who, {
        findUser: (address) => findUserByEmail(lookupUser("google"), address),
        createUser: async (address, sub) => {
          const { error } = await adminClient().auth.admin.createUser({ email: address, email_confirm: true, app_metadata: { [GOOGLE_SUB_KEY]: sub } });
          return { status: error ? (error.status ?? 500) : null };
        },
        bindSub: async (userId, sub) => {
          const { data, error } = await bucketClient().rpc("bind_google_sub", { p_user: userId, p_sub: sub });
          if (!error) return { bound: typeof data === "string" ? data : null, status: null };
          if (!isMissingRpc({ code: error.code, message: error.message })) return { bound: null, status: 500 };
          const updated = await adminClient().auth.admin.updateUserById(userId, { app_metadata: { [GOOGLE_SUB_KEY]: sub } });
          return { bound: updated.error ? null : sub, status: updated.error ? (updated.error.status ?? 500) : null };
        },
        generateLink: async (address) => {
          const { data, error } = await adminClient().auth.admin.generateLink({ type: "magiclink", email: address });
          return error ? { link: null, status: error.status ?? 500 } : { link: { tokenHash: data.properties.hashed_token, type: data.properties.verification_type }, status: null };
        },
        verifyToken: async (tokenHash, type) => {
          const { data, error } = await anonClient().auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
          return { session: error ? null : data.session, status: error ? (error.status ?? 500) : null };
        },
      }),
  },
  deleteAccount: deleteAccountFor,
  reviewDemo: {
    config: () => reviewDemoConfig(process.env.REVIEW_DEMO_EMAIL, process.env.REVIEW_DEMO_CODE, process.env.REVIEW_DEMO_UNTIL, Date.now()),
    signIn: (email) =>
      mintReviewSession(email, {
        findUser: (address) => findUserByEmail(lookupUser("review demo"), address),
        generateLink: async (address) => {
          const { data, error } = await adminClient().auth.admin.generateLink({ type: "magiclink", email: address });
          return error ? { link: null, status: error.status ?? 500 } : { link: { tokenHash: data.properties.hashed_token, type: data.properties.verification_type }, status: null };
        },
        verifyToken: async (tokenHash, type) => {
          const { data, error } = await anonClient().auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
          return { session: error ? null : data.session, status: error ? (error.status ?? 500) : null };
        },
      }),
    log: (event) => console.info("review demo sign-in", JSON.stringify(event)),
  },
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const who = sessionClientIp(req.headers, { secret: process.env.POLINGUAL_PROXY_SECRET });
    if ("reject" in who) return jsonResponse(who.reject.body, who.reject.status);
    const r = await handle(await readJson(req), who.ip, bearerToken(req.headers));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("academy session", e);
    return jsonResponse({ error: "session_failed" }, 502);
  }
}
