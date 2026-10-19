import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeviceAuthDeps } from "./device-auth";
import type { CodeRow, DeviceFlowDeps, MintedSession } from "./device-flow";

const CODE_COLUMNS = "device_code_hash,user_code,device_id,public_key,kind,label,user_id,status,expires_at";

function fail(what: string, e: { message: string } | null): void {
  if (e) throw new Error(`${what}: ${e.message}`);
}

export function deviceAuthStore(svc: () => SupabaseClient): Omit<DeviceAuthDeps, "now"> {
  return {
    async lookup(uid, deviceId) {
      const { data, error } = await svc().from("devices").select("public_key,revoked_at").eq("user_id", uid).eq("device_id", deviceId).maybeSingle();
      fail("device lookup", error);
      return (data as { public_key: string | null; revoked_at: string | null } | null) ?? null;
    },
    async useNonce(uid, deviceId, nonce, ttl) {
      const { data, error } = await svc().rpc("use_device_nonce", { p_user: uid, p_device: deviceId, p_nonce: nonce, p_ttl_seconds: ttl });
      fail("device nonce", error);
      return data === true;
    },
    async deviceSession(uid, sessionId) {
      const { data, error } = await svc().from("device_sessions").select("device_id").eq("user_id", uid).eq("session_id", sessionId).limit(1);
      fail("device session", error);
      return ((data as unknown[]) ?? []).length > 0;
    },
  };
}

export function deviceFlowStore(opts: { svc: () => SupabaseClient; admin: () => SupabaseClient; anon: () => SupabaseClient; url: string; anonKey: string }): Omit<DeviceFlowDeps, "now"> {
  const { svc, admin, anon } = opts;
  return {
    async insertCode(row) {
      const purge = await svc().rpc("purge_device_codes");
      fail("device code purge", purge.error);
      const { error } = await svc().from("device_codes").insert(row);
      fail("device code insert", error);
    },
    async pendingFor(deviceId, nowIso) {
      const { count, error } = await svc().from("device_codes").select("device_code_hash", { count: "exact", head: true }).eq("device_id", deviceId).eq("status", "pending").gt("expires_at", nowIso);
      fail("device code count", error);
      return count ?? 0;
    },
    async peekCode(userCode, nowIso) {
      const { data, error } = await svc().from("device_codes").select(CODE_COLUMNS).eq("user_code", userCode).eq("status", "pending").gt("expires_at", nowIso).maybeSingle();
      fail("device code peek", error);
      return (data as CodeRow | null) ?? null;
    },
    async unconsumeCode(hash) {
      const { error } = await svc().from("device_codes").update({ status: "approved" }).eq("device_code_hash", hash).eq("status", "consumed");
      fail("device code unconsume", error);
    },
    async approveCode(userCode, uid, nowIso) {
      const { data, error } = await svc().from("device_codes").update({ user_id: uid, status: "approved" }).eq("user_code", userCode).eq("status", "pending").gt("expires_at", nowIso).select(CODE_COLUMNS).maybeSingle();
      fail("device code approve", error);
      return (data as CodeRow | null) ?? null;
    },
    async findCode(hash) {
      const { data, error } = await svc().from("device_codes").select(CODE_COLUMNS).eq("device_code_hash", hash).maybeSingle();
      fail("device code read", error);
      return (data as CodeRow | null) ?? null;
    },
    async consumeCode(hash) {
      const { data, error } = await svc().from("device_codes").update({ status: "consumed" }).eq("device_code_hash", hash).eq("status", "approved").select(CODE_COLUMNS).maybeSingle();
      fail("device code consume", error);
      return (data as CodeRow | null) ?? null;
    },
    async registerDevice(uid, row, sessionId) {
      const { data, error } = await svc().rpc("register_device", { p_user: uid, p_device: row.device_id, p_public_key: row.public_key, p_kind: row.kind, p_label: row.label, p_session: sessionId });
      fail("device register", error);
      return data === true;
    },
    async mintSession(uid): Promise<MintedSession> {
      const user = await admin().auth.admin.getUserById(uid);
      const email = user.data.user?.email;
      if (user.error || !email) throw new Error(`device session: no email for user (${user.error?.message ?? "missing"})`);
      const link = await admin().auth.admin.generateLink({ type: "magiclink", email });
      const tokenHash = link.data.properties?.hashed_token;
      if (link.error || !tokenHash) throw new Error(`device session: link failed (${link.error?.message ?? "no token"})`);
      const verified = await anon().auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      const s = verified.data.session;
      if (verified.error || !s) throw new Error(`device session: verify failed (${verified.error?.message ?? "no session"})`);
      const claims = JSON.parse(Buffer.from(s.access_token.split(".")[1], "base64url").toString("utf8")) as { session_id?: string };
      if (!claims.session_id) throw new Error("device session: token has no session_id");
      return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + 3600, session_id: claims.session_id };
    },
    async endSession(uid, sessionId) {
      const { error } = await svc().rpc("end_session", { p_user: uid, p_session: sessionId });
      fail("device end session", error);
    },
    async revokeDevice(uid, deviceId) {
      const { data, error } = await svc().rpc("revoke_device", { p_user: uid, p_device: deviceId });
      fail("device revoke", error);
      const n = Number(data);
      return n < 0 ? null : n;
    },
    async signOutOthers(accessToken) {
      const { error } = await admin().auth.admin.signOut(accessToken, "others");
      fail("sign out others", error);
    },
    publicConfig: () => ({ supabase_url: opts.url, anon_key: opts.anonKey }),
  };
}
