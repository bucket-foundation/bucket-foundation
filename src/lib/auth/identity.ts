/**
 * app.identities, server-only. Same pattern as the Research OS routes: the
 * caller is verified first (cookie session or Bearer token), then a
 * service-role client bound to the private `app` schema reads or writes
 * that person's row alone. Never import from a client component.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkHandle } from "./handle";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function identityConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

let _svc: SupabaseClient | null = null;
function appService(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "app" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

export interface Identity {
  userId: string;
  handle: string | null;
  displayName: string | null;
  wallet: string | null;
  walletChain: string | null;
  createdAt: string;
}

type Row = { user_id: string; handle: string | null; display_name: string | null; wallet: string | null; wallet_chain: string | null; created_at: string };

function fromRow(r: Row): Identity {
  return { userId: r.user_id, handle: r.handle, displayName: r.display_name, wallet: r.wallet, walletChain: r.wallet_chain, createdAt: r.created_at };
}

const COLS = "user_id,handle,display_name,wallet,wallet_chain,created_at";

/** The person's identity row, created on first read if the auth trigger has not run. */
export async function getIdentity(userId: string): Promise<Identity | null> {
  if (!identityConfigured()) return null;
  const svc = appService();
  const { data, error } = await svc.from("identities").select(COLS).eq("user_id", userId).maybeSingle();
  if (error) return null;
  if (data) return fromRow(data as Row);
  const { data: made, error: insErr } = await svc.from("identities").upsert({ user_id: userId }, { onConflict: "user_id" }).select(COLS).single();
  if (insErr || !made) return null;
  return fromRow(made as Row);
}

export type IdentityError = "unavailable" | "invalid_handle" | "reserved_handle" | "handle_taken" | "invalid_wallet" | "wallet_taken" | "write_failed";
export type IdentityResult<T> = { ok: true; value: T } | { ok: false; error: IdentityError };

export async function setHandle(userId: string, raw: string): Promise<IdentityResult<Identity>> {
  if (!identityConfigured()) return { ok: false, error: "unavailable" };
  const check = checkHandle(raw);
  if (!check.ok) return { ok: false, error: check.reason === "reserved" ? "reserved_handle" : "invalid_handle" };
  const { data, error } = await appService().from("identities").upsert({ user_id: userId, handle: check.handle }, { onConflict: "user_id" }).select(COLS).single();
  if (error) return { ok: false, error: error.code === "23505" ? "handle_taken" : "write_failed" };
  return { ok: true, value: fromRow(data as Row) };
}

export async function setDisplayName(userId: string, raw: string): Promise<IdentityResult<Identity>> {
  if (!identityConfigured()) return { ok: false, error: "unavailable" };
  const displayName = raw.trim().slice(0, 80) || null;
  const { data, error } = await appService().from("identities").upsert({ user_id: userId, display_name: displayName }, { onConflict: "user_id" }).select(COLS).single();
  if (error) return { ok: false, error: "write_failed" };
  return { ok: true, value: fromRow(data as Row) };
}

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

/** Link a wallet the person proved they hold (the canon publish flow verifies the signature before calling this). */
export async function linkWallet(userId: string, wallet: string | null, chain: string | null): Promise<IdentityResult<Identity>> {
  if (!identityConfigured()) return { ok: false, error: "unavailable" };
  if (wallet !== null && !WALLET_RE.test(wallet)) return { ok: false, error: "invalid_wallet" };
  const { data, error } = await appService()
    .from("identities")
    .upsert({ user_id: userId, wallet, wallet_chain: wallet ? chain : null }, { onConflict: "user_id" })
    .select(COLS)
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "wallet_taken" : "write_failed" };
  return { ok: true, value: fromRow(data as Row) };
}
