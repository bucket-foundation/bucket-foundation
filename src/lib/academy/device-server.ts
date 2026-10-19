import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { bearerToken, verifyRequestUser } from "../auth/verify";
import { getRequestSupabase } from "../supabase/server";
import { verifyDevice, type DeviceCheck } from "./device-auth";
import { createDeviceFlow } from "./device-flow";
import { deviceAuthStore, deviceFlowStore } from "./device-store";

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const ANON = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const deviceSyncEnabled = () => process.env.ACADEMY_REVIEW_LOG === "on";
export const deviceSyncConfigured = () => Boolean(URL_() && ANON() && SERVICE());

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let bucket: SupabaseClient | null = null;
let admin: SupabaseClient | null = null;
let anon: SupabaseClient | null = null;
const bucketSvc = () => (bucket ??= createClient(URL_(), SERVICE(), { ...opts, db: { schema: "bucket" } }) as unknown as SupabaseClient);
const adminSvc = () => (admin ??= createClient(URL_(), SERVICE(), opts));
const anonSvc = () => (anon ??= createClient(URL_(), ANON(), opts));

export function serverVerifyDevice(req: Request, uid: string, body: string): Promise<DeviceCheck> {
  return verifyDevice(req, uid, body, { now: Date.now, ...deviceAuthStore(bucketSvc) });
}

export const deviceFlow = createDeviceFlow({ now: Date.now, ...deviceFlowStore({ svc: bucketSvc, admin: adminSvc, anon: anonSvc, url: URL_(), anonKey: ANON() }) });

export async function requestUser(req: NextRequest): Promise<string | null> {
  return (await verifyRequestUser(req))?.id ?? null;
}

export async function requestAccessToken(req: NextRequest): Promise<string | null> {
  const bearer = bearerToken(req);
  if (bearer) return bearer;
  try {
    const { data } = await getRequestSupabase(req).auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function listDevices(uid: string): Promise<unknown[]> {
  const { data, error } = await bucketSvc().from("devices").select("device_id,kind,label,registered_at,last_seen_at,revoked_at").eq("user_id", uid).not("public_key", "is", null).order("registered_at", { ascending: false });
  if (error) throw new Error(`device list: ${error.message}`);
  return (data as unknown[]) ?? [];
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
