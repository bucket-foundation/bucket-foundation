/**
 * bucket.foundation, /api/academy/profile (bkt-coh)
 * ----------------------------------------------------------------------------
 * The Mastery Profile API: the public, shareable "verifiable digital resume"
 * (MVP /-signal phase, see learning/research/landscape/MASTERY-PROFILE.md
 * Phase 0/1, learning/EPIC.md §2). Two roles, one route:
 *
 * 1. PUBLIC READ (no auth): GET /api/academy/profile?handle=<handle>
 * Resolve handle -> user (service-role) and, IF the profile is public,
 * assemble + return the Mastery Profile (map + per-branch mastery
 * rollup + per-concept depth/recency). 404 if no public profile.
 *
 * 2. OWNER READ (auth): GET /api/academy/profile?me=1
 * Return the caller's OWN profile record (handle, display_name, is_public)
 * plus a preview of their assembled profile, so the in-app share UI can
 * show "your public link" + current visibility.
 *
 * 3. CLAIM/TOGGLE (auth): POST /api/academy/profile
 * body: { handle?, display_name?, is_public? }
 * Claim a handle and/or set display name and/or toggle visibility. The
 * caller is identified ONLY by their verified Supabase access token, 
 * never by a client-supplied id (same discipline as the progress route).
 *
 * SECURITY / PRIVACY (read before changing):
 * - The bucket.academy_profiles + bucket.academy_progress tables live in the
 * PRIVATE `bucket` Postgres schema, which the shared PostgREST does NOT
 * expose. The browser CANNOT read them directly; everything goes through
 * this same-origin Next.js route using a SERVER-ONLY service-role client.
 * - Default private. A profile is rendered publicly ONLY when is_public = true.
 * - Minimal PII: handle + optional display_name. Email is NEVER returned on the
 * public path. The public read does not require or accept a token.
 * - The service-role key bypasses RLS, so per-user ownership for writes is
 * enforced HERE: every upsert forces user_id = the verified token's user.
 *
 * HARD GUARDRAIL (EPIC.md §5): no certified/precise numeric rating is computed
 * or returned. The rollup (src/lib/academy/mastery.ts) emits
 * uncertainty-visible signal only.
 *
 * When SUPABASE_SERVICE_ROLE_KEY is absent the route returns 503 and the in-app
 * share UI silently hides (nothing breaks).
 */

import { NextRequest, NextResponse } from "next/server";
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

/** Verify the caller's Supabase access token; return their user id or null. */
async function verifyUser(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  try {
    const verifier = createClient(SUPABASE_URL as string, ANON_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

interface ProfileRecord {
  user_id: string;
  handle: string;
  display_name: string | null;
  is_public: boolean;
}

/** Read all progress rows for a user (service-role, hard per-user filter). */
async function readProgressRows(uid: string): Promise<ProgressRow[]> {
  const { data, error } = await service()
    .from(PROGRESS)
    .select("branch,data,updated_at")
    .eq("user_id", uid);
  if (error || !data) return [];
  return data as unknown as ProgressRow[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);

  const url = new URL(req.url);
  const handleParam = url.searchParams.get("handle");
  const me = url.searchParams.get("me");

  // ---- OWNER READ: the caller's own profile record + preview --------------
  if (me) {
    const uid = await verifyUser(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { data, error } = await service()
      .from(PROFILES)
      .select("user_id,handle,display_name,is_public")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return json({ error: "read_failed" }, 500);

    if (!data) return json({ profile: null }); // no handle claimed yet

    const rec = data as unknown as ProfileRecord;
    const rows = await readProgressRows(uid);
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

  // ---- PUBLIC READ: by handle, only if public ------------------------------
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
  if (!rec.is_public) return json({ error: "not_found" }, 404); // private == invisible

  const rows = await readProgressRows(rec.user_id);
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

  // Load any existing record so partial updates (e.g. toggle only) work.
  const { data: existing, error: readErr } = await service()
    .from(PROFILES)
    .select("user_id,handle,display_name,is_public")
    .eq("user_id", uid)
    .maybeSingle();
  if (readErr) return json({ error: "read_failed" }, 500);
  const current = (existing as unknown as ProfileRecord) || null;

  // Resolve the next field values from the request, falling back to current.
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

  // Handle uniqueness: if changing handle, ensure no OTHER user owns it.
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
    user_id: uid, // FORCE ownership to the verified user
    handle: nextHandle,
    display_name: nextDisplay,
    is_public: nextPublic,
  };

  const { error: upErr } = await service()
    .from(PROFILES)
    .upsert(row, { onConflict: "user_id" });
  if (upErr) {
    // unique-violation on lower(handle) surfaces here as a race with handle_taken
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
