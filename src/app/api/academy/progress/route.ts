/**
 * bucket.foundation, /api/academy/progress (bkt-aja)
 * ----------------------------------------------------
 * Server-side cross-device progress store for the Bucket Academy (the static
 * learning app served at /academy-app). Backs the optional email-OTP "Save
 * progress" sign-in (bkt-su9).
 *
 * WHY THIS ROUTE EXISTS (the load-bearing reason, read before changing):
 *
 * The Academy persists FSRS state in localStorage under
 * `bucket-academy/v1/<branch>`. To sync it across devices we store one row
 * per (user, branch) in `bucket.academy_progress` on the self-hosted,
 * MULTI-TENANT Supabase at https://db.agfarms.dev.
 *
 * That table lives in the `bucket` Postgres schema, which the shared
 * PostgREST (agf-supabase-rest) does NOT expose (PGRST_DB_SCHEMAS =
 * public,storage,graphql_public,zona_franca,polingual). Exposing `bucket`
 * would require restarting a PostgREST shared with OTHER tenants
 * (zona_franca, polingual, …), forbidden. So the browser CANNOT reach the
 * table directly via supabase-js `.from()` / `.schema('bucket')`.
 *
 * Instead, the browser talks to THIS same-origin Next.js route. We:
 * 1. read the caller's Supabase access token (Authorization: Bearer …),
 * 2. verify it against gotrue with the PUBLIC anon key → resolve user.id,
 * 3. use a SERVER-ONLY service_role client to read/write ONLY that user's
 * rows in bucket.academy_progress.
 *
 * The service_role key bypasses RLS, so the per-user boundary is enforced
 * HERE, in application code: every query is hard-filtered by the verified
 * user_id and every upsert forces user_id = the verified user. A caller can
 * never read or write another user's rows. This reproduces the table's
 * own-row RLS policies at the app layer while keeping the `bucket` schema
 * private to PostgREST.
 *
 * ENVIRONMENT (server-side; never sent to the browser except the two PUBLIC
 * vars, which are public by design):
 * NEXT_PUBLIC_SUPABASE_URL public Supabase base URL (https://db.agfarms.dev)
 * NEXT_PUBLIC_SUPABASE_ANON_KEY public anon key, used ONLY to verify tokens
 * SUPABASE_SERVICE_ROLE_KEY SERVER-ONLY service-role key, reaches the
 * private `bucket` schema. NEVER ships to the
 * client, NEVER committed. Lives in Vercel env.
 *
 * When SUPABASE_SERVICE_ROLE_KEY is absent the route returns 503 and the
 * Academy silently falls back to anonymous + local-first (nothing breaks).
 *
 * OpenAPI (informal):
 * GET /api/academy/progress
 * headers: Authorization: Bearer <supabase access token> (required)
 * 200: { branches: { "<branch>": { data: <blob>, updated_at: <iso> } } }
 * 401: { error: "unauthorized" }
 * 503: { error: "sync_unavailable" } // service role not configured
 *
 * POST /api/academy/progress
 * headers: Authorization: Bearer <supabase access token> (required)
 * body (either form):
 * { "branch": "<branch>", "data": <blob> } // one branch
 * { "branches": { "<branch>": <blob>... } } // bulk
 * 200: { ok: true, written: <n> }
 * 400: { error: "bad_request" }
 * 401: { error: "unauthorized" }
 * 503: { error: "sync_unavailable" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The private schema + table holding one row per (user, branch).
const SCHEMA = "bucket";
const TABLE = "academy_progress";

// Branch keys are short slugs the engine writes (e.g. "01-mathematics",
// "lang-core"). Keep them sane so a malicious client can't smuggle junk.
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const CORS_HEADERS: Record<string, string> = {
  // The Academy is served same-origin at /academy-app, but the static app may
  // also run standalone (./serve.sh) during dev; keep it permissive but safe
  // (this route only ever acts on the verified token's own user).
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

/** True only when both the public verify key and the server service key exist. */
function configured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

/** Service-role client bound to the private `bucket` schema (memoized).
 * createClient narrows its type from the `db.schema` option to a schema name
 * that isn't in the (untyped) Database generic, so we erase the generics back
 * to the default `SupabaseClient` shape, table/column names are plain strings
 * here, so nothing downstream needs the narrowed schema type. */
let _svc: SupabaseClient | null = null;
function service(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

/**
 * Verify the caller's Supabase access token with the PUBLIC anon key and
 * return their user id, or null. We deliberately do NOT trust any user id the
 * client might send, only the token, verified by gotrue, decides identity.
 */
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);

  const uid = await verifyUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const { data, error } = await service()
    .from(TABLE)
    .select("branch,data,updated_at")
    .eq("user_id", uid); // hard per-user filter, service role bypasses RLS

  if (error) return json({ error: "read_failed" }, 500);

  const branches: Record<string, { data: unknown; updated_at: string }> = {};
  for (const row of data || []) {
    branches[(row as { branch: string }).branch] = {
      data: (row as { data: unknown }).data,
      updated_at: (row as { updated_at: string }).updated_at,
    };
  }
  return json({ branches });
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
  if (!body || typeof body !== "object") {
    return json({ error: "bad_request" }, 400);
  }

  // Normalize both shapes into a { branch -> data } map.
  const b = body as { branch?: unknown; data?: unknown; branches?: unknown };
  const updates: Record<string, unknown> = {};

  if (typeof b.branch === "string") {
    updates[b.branch] = b.data ?? {};
  } else if (b.branches && typeof b.branches === "object") {
    for (const [k, v] of Object.entries(b.branches as Record<string, unknown>)) {
      // The bulk form may pass either the raw blob or { data, updated_at }.
      updates[k] =
        v && typeof v === "object" && "data" in (v as object)
          ? (v as { data: unknown }).data
          : v;
    }
  } else {
    return json({ error: "bad_request" }, 400);
  }

  // Validate branch keys; reject the whole request on any bad key so the client
  // gets a clear signal rather than a silent partial write.
  const branches = Object.keys(updates);
  if (branches.length === 0 || branches.length > 64) {
    return json({ error: "bad_request" }, 400);
  }
  for (const branch of branches) {
    if (!BRANCH_RE.test(branch)) return json({ error: "bad_request" }, 400);
  }

  const now = new Date().toISOString();
  const rows = branches.map((branch) => ({
    user_id: uid, // FORCE ownership to the verified user, never trust the client
    branch,
    data: updates[branch] ?? {},
    updated_at: now,
  }));

  const { error } = await service()
    .from(TABLE)
    .upsert(rows, { onConflict: "user_id,branch" });

  if (error) return json({ error: "write_failed" }, 500);

  return json({ ok: true, written: rows.length });
}
