import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { parseAnswer, type Answer } from "@/lib/brand-pick/answers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "brand_picks";
const RESETS = "brand_pick_resets";
const BATCH_MAX = 300;
const HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

interface Row {
  aspect: string;
  a: string;
  b: string;
  round: number;
  left_id: string;
  choice: string | null;
  note: string;
  answered_at: string;
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: HEADERS });
}

let svc: SupabaseClient | null = null;
function service(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  svc ??= createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return svc;
}

function rowToAnswer(row: Row): Answer | null {
  return parseAnswer({ aspect: row.aspect, a: row.a, b: row.b, round: row.round, left: row.left_id, choice: row.choice, note: row.note, at: row.answered_at });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await verifyRequestUser(req);
  if (!user) return json({ signedIn: false, answers: [] });
  const db = service();
  if (!db) return json({ signedIn: true, storage: "unavailable", answers: [] }, 503);
  const reset = await db.from(RESETS).select("cleared_at").eq("user_id", user.id).maybeSingle();
  if (reset.error) return json({ signedIn: true, error: "read_failed", answers: [] }, 502);
  const clearedAt = (reset.data as { cleared_at: string } | null)?.cleared_at ?? null;
  const { data, error } = await db.from(TABLE).select("aspect,a,b,round,left_id,choice,note,answered_at").eq("user_id", user.id).order("answered_at");
  if (error) return json({ signedIn: true, error: "read_failed", answers: [] }, 502);
  const answers = ((data ?? []) as Row[]).map(rowToAnswer).filter((x): x is Answer => x !== null);
  return json({ signedIn: true, clearedAt, answers });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await verifyRequestUser(req);
  if (!user) return json({ error: "sign_in_required" }, 401);
  const db = service();
  if (!db) return json({ error: "storage_unavailable" }, 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const list = (body as { answers?: unknown })?.answers;
  if (!Array.isArray(list) || list.length === 0 || list.length > BATCH_MAX) return json({ error: "bad_answer" }, 400);
  const parsed = list.map(parseAnswer);
  if (parsed.some((x) => x === null)) return json({ error: "bad_answer" }, 400);
  const now = new Date().toISOString();
  const reset = await db.from(RESETS).select("cleared_at").eq("user_id", user.id).maybeSingle();
  if (reset.error) return json({ error: "read_failed" }, 502);
  const clearedAt = (reset.data as { cleared_at: string } | null)?.cleared_at ?? "";
  const existing = await db.from(TABLE).select("aspect,a,b,round,answered_at").eq("user_id", user.id);
  if (existing.error) return json({ error: "read_failed" }, 502);
  const newest = new Map(((existing.data ?? []) as Row[]).map((r) => [`${r.aspect}:${r.a}:${r.b}:${r.round}`, new Date(r.answered_at).toISOString()]));
  const answers = (parsed as Answer[])
    .map((x) => ({ ...x, at: x.at > now ? now : x.at }))
    .filter((x) => x.at > clearedAt && (newest.get(`${x.aspect}:${x.a}:${x.b}:${x.round}`) ?? "") <= x.at);
  if (answers.length === 0) return json({ saved: 0 });
  const rows = answers.map((x) => ({
    user_id: user.id,
    aspect: x.aspect,
    a: x.a,
    b: x.b,
    round: x.round,
    left_id: x.left,
    choice: x.choice,
    note: x.note,
    answered_at: x.at,
  }));
  const { error } = await db.from(TABLE).upsert(rows, { onConflict: "user_id,aspect,a,b,round" });
  if (error) return json({ error: "write_failed" }, 502);
  return json({ saved: rows.length });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await verifyRequestUser(req);
  if (!user) return json({ error: "sign_in_required" }, 401);
  const db = service();
  if (!db) return json({ error: "storage_unavailable" }, 503);
  const mark = await db.from(RESETS).upsert({ user_id: user.id, cleared_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (mark.error) return json({ error: "delete_failed" }, 502);
  const { error } = await db.from(TABLE).delete().eq("user_id", user.id);
  if (error) return json({ error: "delete_failed" }, 502);
  return json({ cleared: true });
}
