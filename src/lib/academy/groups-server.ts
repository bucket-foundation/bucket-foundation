import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { branchLabel, corpusDir, loadCorpusForBranch } from "./corpus";
import { buildLangCorpus, type LangCorpus } from "./lang-systems";
import {
  assembleGroup,
  currentWeek,
  fetchAllPages,
  generateInviteCode,
  JOIN_PER_MINUTE,
  PREVIEW_PER_MINUTE,
  windowLimiter,
  visibleGroupIds,
  memberSummary,
  type BranchRow,
  type CheerRow,
  type CorpusLookup,
  type WordLookup,
  type Group,
  type GroupRow,
  type MemberRow,
  type MemberSummary,
} from "./groups";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const GROUPS = "learning_groups";
export const MEMBERS = "group_members";
export const CHEERS = "group_cheers";
const PROGRESS = "academy_progress";
const GROUP_COLS = "id,name,kind,owner_id,invite_code,weekly_goal,created_at";
export const CHEER_COLS = "id,group_id,from_id,to_id,kind,created_at,seen_at";
const CHEER_WINDOW_MS = 7 * 86_400_000;
const MEMBER_COLS = "group_id,user_id,role,display_name,joined_at";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "cache-control": "no-store",
};

export class GroupsError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function configured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

let _svc: SupabaseClient | null = null;
export function service(): SupabaseClient {
  if (_svc) return _svc;
  _svc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _svc;
}

export const previewLimited = windowLimiter(PREVIEW_PER_MINUTE, 60_000);
export const joinLimited = windowLimiter(JOIN_PER_MINUTE, 60_000);

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function requestUser(req: NextRequest): Promise<string | null> {
  const user = await verifyRequestUser(req);
  return user?.id ?? null;
}

export async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function fail(err: unknown, where: string): NextResponse {
  if (err instanceof GroupsError) return json({ error: err.code }, err.status);
  console.error(`[academy/groups] ${where}:`, err instanceof Error ? err.message : err);
  return json({ error: "sync_unavailable" }, 503);
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export function limitError(message: string | undefined): GroupsError | null {
  const m = message || "";
  if (m.includes("group_full")) return new GroupsError("group_full", 409);
  if (m.includes("joined_limit")) return new GroupsError("joined_limit", 409);
  if (m.includes("owned_limit")) return new GroupsError("owned_limit", 409);
  return null;
}

export async function groupById(id: string): Promise<GroupRow | null> {
  return check(await service().from(GROUPS).select(GROUP_COLS).eq("id", id).maybeSingle(), "group read") as GroupRow | null;
}

export async function groupByCode(code: string): Promise<GroupRow | null> {
  return check(await service().from(GROUPS).select(GROUP_COLS).eq("invite_code", code).maybeSingle(), "group read") as GroupRow | null;
}

export async function membersOf(groupIds: string[]): Promise<MemberRow[]> {
  if (groupIds.length === 0) return [];
  return (check(await service().from(MEMBERS).select(MEMBER_COLS).in("group_id", groupIds), "members read") ?? []) as MemberRow[];
}

export async function membershipsOf(uid: string): Promise<MemberRow[]> {
  return (check(await service().from(MEMBERS).select(MEMBER_COLS).eq("user_id", uid), "memberships read") ?? []) as MemberRow[];
}

export async function countOwned(uid: string): Promise<number> {
  const res = await service().from(GROUPS).select("id", { count: "exact", head: true }).eq("owner_id", uid);
  if (res.error) throw new Error(`owned count: ${res.error.message}`);
  return res.count ?? 0;
}

export async function insertGroupWithCode(row: Omit<GroupRow, "id" | "invite_code" | "created_at" | "weekly_goal">): Promise<GroupRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await service().from(GROUPS).insert({ ...row, invite_code: generateInviteCode() }).select(GROUP_COLS).single();
    if (!res.error) return res.data as GroupRow;
    const limit = limitError(res.error.message);
    if (limit) throw limit;
    if (!/duplicate key|unique/i.test(res.error.message)) throw new Error(`group insert: ${res.error.message}`);
  }
  throw new Error("group insert: no free invite code");
}

export async function rotateCode(groupId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const res = await service().from(GROUPS).update({ invite_code: code }).eq("id", groupId);
    if (!res.error) return code;
    if (!/duplicate key|unique/i.test(res.error.message)) throw new Error(`code rotate: ${res.error.message}`);
  }
  throw new Error("code rotate: no free invite code");
}

export const lookup: CorpusLookup = (branch) => {
  const corpus = loadCorpusForBranch(branch);
  return corpus ? { corpus, title: branchLabel(branch) } : null;
};

let _lang: LangCorpus | null | undefined;
function langCorpus(): LangCorpus | null {
  if (_lang !== undefined) return _lang;
  const read = (name: string) => {
    try {
      return JSON.parse(readFileSync(join(corpusDir(), name), "utf8"));
    } catch {
      return null;
    }
  };
  const core = read("lang-core.json");
  _lang = core ? buildLangCorpus(core, read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json")) : null;
  return _lang;
}

export const words: WordLookup = (lang, itemId) => {
  const item = langCorpus()?.byId.get(itemId);
  const form = item?.forms[lang];
  return item && form ? { form, gloss: item.gloss } : null;
};

export async function progressRows(userIds: string[]): Promise<(BranchRow & { user_id: string })[]> {
  if (userIds.length === 0) return [];
  return fetchAllPages(async (from, to) => {
    const res = await service().from(PROGRESS).select("user_id,branch,data").in("user_id", userIds).order("user_id").order("branch").range(from, to);
    return (check(res, "progress read") ?? []) as (BranchRow & { user_id: string })[];
  });
}

export async function summaries(userIds: string[], now: number, tz?: string): Promise<Map<string, MemberSummary>> {
  const out = new Map<string, MemberSummary>();
  if (userIds.length === 0) return out;
  const rows = await progressRows(userIds);
  const byUser = new Map<string, BranchRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }
  for (const id of userIds) out.set(id, memberSummary(byUser.get(id) ?? [], lookup, now, tz, words));
  return out;
}

async function groupsByIds(ids: string[]): Promise<GroupRow[]> {
  return (check(await service().from(GROUPS).select(GROUP_COLS).in("id", ids), "groups read") ?? []) as GroupRow[];
}

export async function groupsFor(uid: string, groupIds?: string[], tz?: string): Promise<Group[]> {
  const ids = visibleGroupIds(await membershipsOf(uid), groupIds);
  if (ids.length === 0) return [];
  const [visible, members] = await Promise.all([groupsByIds(ids), membersOf(ids)]);
  const users = Array.from(new Set(members.map((m) => m.user_id)));
  const now = Date.now();
  const [sums, cheers] = await Promise.all([summaries(users, now, tz), cheersOf(uid, visible.map((g) => g.id), now)]);
  const { weekStart } = currentWeek(now, tz);
  return visible
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
    .map((g) => assembleGroup(g, members, sums, uid, cheers, weekStart));
}

async function cheersOf(uid: string, groupIds: string[], now: number): Promise<CheerRow[]> {
  if (groupIds.length === 0) return [];
  const res = await service()
    .from(CHEERS)
    .select(CHEER_COLS)
    .in("group_id", groupIds)
    .or(`to_id.eq.${uid},from_id.eq.${uid}`)
    .gte("created_at", new Date(now - CHEER_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(500);
  return (check(res, "cheers read") ?? []) as CheerRow[];
}


export async function oneGroup(uid: string, groupId: string, tz?: string): Promise<Group> {
  const [g] = await groupsFor(uid, [groupId], tz);
  if (!g) throw new GroupsError("not_found", 404);
  return g;
}
