import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OpenBadgeCredential } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SCHEMA = "bucket";
const TABLE = "academy_credentials";

export function dbConfigured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

let _svc: SupabaseClient | null = null;
export function service(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

export async function verifyUserToken(token: string | null): Promise<string | null> {
  if (!token || !SUPABASE_URL || !ANON_KEY) return null;
  try {
    const verifier = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export interface CredentialRow {
  id: string;
  user_id: string;
  handle: string;
  jwt: string;
  credential: OpenBadgeCredential;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export async function insertCredential(row: {
  id: string;
  user_id: string;
  handle: string;
  jwt: string;
  credential: OpenBadgeCredential;
  issued_at: string;
}): Promise<boolean> {
  const { error } = await service().from(TABLE).insert({
    id: row.id,
    user_id: row.user_id,
    handle: row.handle,
    jwt: row.jwt,
    credential: row.credential,
    issued_at: row.issued_at,
    revoked_at: null,
    revocation_reason: null,
  });
  return !error;
}

export async function getCredential(id: string): Promise<CredentialRow | null> {
  const { data, error } = await service()
    .from(TABLE)
    .select("id,user_id,handle,jwt,credential,issued_at,revoked_at,revocation_reason")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as CredentialRow;
}

export async function getCredentialByUrl(urlOrId: string): Promise<CredentialRow | null> {
  const m = urlOrId.match(/credential\/([0-9a-fA-F-]{8,})/);
  const id = m ? m[1] : urlOrId.trim();
  if (!/^[0-9a-fA-F-]{8,}$/.test(id)) return null;
  return getCredential(id);
}

export async function listCredentialsForUser(uid: string): Promise<CredentialRow[]> {
  const { data, error } = await service()
    .from(TABLE)
    .select("id,user_id,handle,jwt,credential,issued_at,revoked_at,revocation_reason")
    .eq("user_id", uid)
    .order("issued_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as CredentialRow[];
}

export type RevokeResult = "revoked" | "no_row" | "unavailable";

export async function revokeCredential(
  id: string,
  uid: string,
  reason: string | null
): Promise<RevokeResult> {
  const { data, error } = await service()
    .from(TABLE)
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: reason || "Revoked by issuer/owner.",
    })
    .eq("id", id)
    .eq("user_id", uid)
    .is("revoked_at", null)
    .select("id");
  if (error) return "unavailable";
  return ((data as unknown[]) ?? []).length > 0 ? "revoked" : "no_row";
}
