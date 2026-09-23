import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assemblePublicProfile,
  normalizeHandle,
  type ProgressRow,
} from "@/lib/academy/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SCHEMA = "bucket";
const PROFILES = "academy_profiles";
const PROGRESS = "academy_progress";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function configured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

let _svc: SupabaseClient | null = null;
function service(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

async function verifyUser(req: NextRequest): Promise<string | null> {
  const user = await verifyRequestUser(req);
  return user?.id ?? null;
}

interface ProfileRecord {
  user_id: string;
  handle: string;
  display_name: string | null;
  is_public: boolean;
}

async function readProgressRows(uid: string): Promise<ProgressRow[]> {
  const { data, error } = await service()
    .from(PROGRESS)
    .select("branch,data,updated_at")
    .eq("user_id", uid);
  if (error) throw new Error(`academy_progress read failed: ${error.message}`);
  if (!data) return [];
  return data as unknown as ProgressRow[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);

  const url = new URL(req.url);
  const handleParam = url.searchParams.get("handle");
  const me = url.searchParams.get("me");

  if (me) {
    const uid = await verifyUser(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { data, error } = await service()
      .from(PROFILES)
      .select("user_id,handle,display_name,is_public")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return json({ error: "read_failed" }, 500);

    if (!data) return json({ profile: null });

    const rec = data as unknown as ProfileRecord;
    let rows: ProgressRow[];
    try {
      rows = await readProgressRows(uid);
    } catch (err) {
      console.error("[academy/profile] progress read failed:", err instanceof Error ? err.message : err);
      return json({ error: "sync_unavailable" }, 503);
    }
    const preview = assemblePublicProfile(rec.handle, rec.display_name, rows);
    return json({
      profile: {
        handle: rec.handle,
        displayName: rec.display_name,
        isPublic: rec.is_public,
        url: `/m/${rec.handle}`,
      },
      preview,
    });
  }

  if (!handleParam) return json({ error: "bad_request" }, 400);
  const handle = normalizeHandle(handleParam);
  if (!handle) return json({ error: "not_found" }, 404);

  const { data, error } = await service()
    .from(PROFILES)
    .select("user_id,handle,display_name,is_public")
    .eq("handle", handle)
    .maybeSingle();
  if (error) return json({ error: "read_failed" }, 500);
  if (!data) return json({ error: "not_found" }, 404);

  const rec = data as unknown as ProfileRecord;
  if (!rec.is_public) return json({ error: "not_found" }, 404);

  let rows: ProgressRow[];
  try {
    rows = await readProgressRows(rec.user_id);
  } catch (err) {
    console.error("[academy/profile] progress read failed:", err instanceof Error ? err.message : err);
    return json({ error: "sync_unavailable" }, 503);
  }
  const profile = assemblePublicProfile(rec.handle, rec.display_name, rows);
  return json({ profile });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);

  const uid = await verifyUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "bad_request" }, 400);
  const b = body as { handle?: unknown; display_name?: unknown; is_public?: unknown };

  const { data: existing, error: readErr } = await service()
    .from(PROFILES)
    .select("user_id,handle,display_name,is_public")
    .eq("user_id", uid)
    .maybeSingle();
  if (readErr) return json({ error: "read_failed" }, 500);
  const current = (existing as unknown as ProfileRecord) || null;

  let nextHandle = current?.handle;
  if (b.handle !== undefined) {
    const h = normalizeHandle(b.handle);
    if (!h) {
      return json(
        {
          error: "invalid_handle",
          message:
            "Handles are 3–32 chars: lowercase letters, numbers, and single internal - or _.",
        },
        400
      );
    }
    nextHandle = h;
  }
  if (!nextHandle) {
    return json({ error: "handle_required" }, 400);
  }

  let nextDisplay = current?.display_name ?? null;
  if (b.display_name !== undefined) {
    if (b.display_name === null) nextDisplay = null;
    else if (typeof b.display_name === "string") {
      const dn = b.display_name.trim().slice(0, 60);
      nextDisplay = dn.length ? dn : null;
    } else {
      return json({ error: "bad_request" }, 400);
    }
  }

  let nextPublic = current?.is_public ?? false;
  if (b.is_public !== undefined) {
    if (typeof b.is_public !== "boolean") return json({ error: "bad_request" }, 400);
    nextPublic = b.is_public;
  }

  if (!current || current.handle !== nextHandle) {
    const { data: taken, error: takenErr } = await service()
      .from(PROFILES)
      .select("user_id")
      .eq("handle", nextHandle)
      .maybeSingle();
    if (takenErr) return json({ error: "read_failed" }, 500);
    if (taken && (taken as { user_id: string }).user_id !== uid) {
      return json({ error: "handle_taken" }, 409);
    }
  }

  const row = {
    user_id: uid,
    handle: nextHandle,
    display_name: nextDisplay,
    is_public: nextPublic,
  };

  const { error: upErr } = await service()
    .from(PROFILES)
    .upsert(row, { onConflict: "user_id" });
  if (upErr) {
    const msg = (upErr as { message?: string }).message || "";
    if (/duplicate key|unique/i.test(msg)) return json({ error: "handle_taken" }, 409);
    return json({ error: "write_failed" }, 500);
  }

  return json({
    ok: true,
    profile: {
      handle: nextHandle,
      displayName: nextDisplay,
      isPublic: nextPublic,
      url: `/m/${nextHandle}`,
    },
  });
}
