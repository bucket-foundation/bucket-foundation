import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { syncAcademyMastery } from "@/lib/research-os/learn-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SCHEMA = "bucket";
const TABLE = "academy_progress";

const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);

  const uid = await verifyUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const { data, error } = await service()
    .from(TABLE)
    .select("branch,data,updated_at")
    .eq("user_id", uid);

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

  const b = body as { branch?: unknown; data?: unknown; branches?: unknown };
  const updates: Record<string, unknown> = {};

  if (typeof b.branch === "string") {
    updates[b.branch] = b.data ?? {};
  } else if (b.branches && typeof b.branches === "object") {
    for (const [k, v] of Object.entries(b.branches as Record<string, unknown>)) {
      updates[k] =
        v && typeof v === "object" && "data" in (v as object)
          ? (v as { data: unknown }).data
          : v;
    }
  } else {
    return json({ error: "bad_request" }, 400);
  }

  const branches = Object.keys(updates);
  if (branches.length === 0 || branches.length > 64) {
    return json({ error: "bad_request" }, 400);
  }
  for (const branch of branches) {
    if (!BRANCH_RE.test(branch)) return json({ error: "bad_request" }, 400);
  }

  const now = new Date().toISOString();
  const rows = branches.map((branch) => ({
    user_id: uid,
    branch,
    data: updates[branch] ?? {},
    updated_at: now,
  }));

  const { error } = await service()
    .from(TABLE)
    .upsert(rows, { onConflict: "user_id,branch" });

  if (error) return json({ error: "write_failed" }, 500);

  let advanced = 0;
  for (const row of rows) {
    try {
      advanced += (await syncAcademyMastery(uid, row.branch, row.data)).advanced;
    } catch {
    }
  }

  return json({ ok: true, written: rows.length, advanced });
}
