import { NextRequest, NextResponse } from "next/server";
import { progressDeps as deps, writeProgress } from "@/lib/academy/progress-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "academy_progress";

const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-bkt-device",
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!deps.configured()) return json({ error: "sync_unavailable" }, 503);

  const uid = await deps.verifyUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const device = await deps.verifyDevice(req, uid, "");
  if (!device.ok) return json({ error: "device_refused", reason: device.reason }, 401);

  const { data, error } = await deps.service()
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
  if (!deps.configured()) return json({ error: "sync_unavailable" }, 503);

  const text = await req.text().catch(() => "");
  const uid = await deps.verifyUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const device = await deps.verifyDevice(req, uid, text);
  if (!device.ok) return json({ error: "device_refused", reason: device.reason }, 401);

  const band = await deps.readAgeBand(uid);
  if (!band.ok) return json({ error: "consent_unavailable" }, 503);
  const gate = deps.decideLearnWrite(band.band, band.consent ?? null);
  if (!gate.allowed) return json({ error: gate.reason, message: gate.message, needsProfile: gate.reason === "no_profile" }, 403);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "bad_request" }, 400);
  }

  const b = body as { branch?: unknown; data?: unknown; branches?: unknown; reset?: unknown; version?: unknown };
  const updates: Record<string, unknown> = {};
  const versions: Record<string, string | null> = {};
  const version = (v: unknown) => (typeof v === "string" || v === null ? v : undefined);

  if (typeof b.branch === "string") {
    updates[b.branch] = b.data ?? {};
    const v = version(b.version);
    if (v !== undefined) versions[b.branch] = v;
  } else if (b.branches && typeof b.branches === "object") {
    for (const [k, v] of Object.entries(b.branches as Record<string, unknown>)) {
      const wrapped = v && typeof v === "object" && "data" in (v as object);
      updates[k] = wrapped ? (v as { data: unknown }).data : v;
      const ver = wrapped ? version((v as { version?: unknown }).version) : undefined;
      if (ver !== undefined) versions[k] = ver;
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

  for (const v of Object.values(versions)) if (v !== null && Number.isNaN(Date.parse(v))) return json({ error: "bad_request" }, 400);

  const result = await writeProgress(uid, updates, b.reset === true, versions);
  if (!result) return json({ error: "write_failed" }, 500);
  if (result.written.length === 0 && result.stale.length > 0) return json({ error: "stale", stale: result.stale }, 409);
  if (result.written.length === 0) return json({ error: "blank_overwrite", branches: result.refused }, 409);

  let advanced = 0;
  for (const branch of result.written) {
    try {
      advanced += (await deps.syncMastery(uid, branch, updates[branch] ?? {})).advanced;
    } catch {
    }
  }

  return json({ ok: true, written: result.written.length, refused: result.refused, stale: result.stale, advanced });
}
