import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { branchLabel, loadCorpusForBranch } from "./corpus";
import {
  assembleGroup,
  generateInviteCode,
  memberSummary,
  type BranchRow,
  type CorpusLookup,
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
const PROGRESS = "academy_progress";
const GROUP_COLS = "id,name,kind,owner_id,invite_code,created_at";
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

export async function insertGroupWithCode(row: Omit<GroupRow, "id" | "invite_code" | "created_at">): Promise<GroupRow> {
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

const lookup: CorpusLookup = (branch) => {
  const corpus = loadCorpusForBranch(branch);
  return corpus ? { corpus, title: branchLabel(branch) } : null;
};

async function summaries(userIds: string[], now: number, tz?: string): Promise<Map<string, MemberSummary>> {
  const out = new Map<string, MemberSummary>();
  if (userIds.length === 0) return out;
  const rows = (check(await service().from(PROGRESS).select("user_id,branch,data").in("user_id", userIds), "progress read") ?? []) as (BranchRow & { user_id: string })[];
  const byUser = new Map<string, BranchRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }
  for (const id of userIds) out.set(id, memberSummary(byUser.get(id) ?? [], lookup, now, tz));
  return out;
}

export async function groupsFor(uid: string, groupIds?: string[], tz?: string): Promise<Group[]> {
  const ids = groupIds ?? (await membershipsOf(uid)).map((m) => m.group_id);
  if (ids.length === 0) return [];
  const groups = (check(await service().from(GROUPS).select(GROUP_COLS).in("id", ids), "groups read") ?? []) as GroupRow[];
  const members = await membersOf(groups.map((g) => g.id));
  const visible = groups.filter((g) => members.some((m) => m.group_id === g.id && m.user_id === uid));
  const users = Array.from(new Set(members.filter((m) => visible.some((g) => g.id === m.group_id)).map((m) => m.user_id)));
  const sums = await summaries(users, Date.now(), tz);
  return visible
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
    .map((g) => assembleGroup(g, members, sums, uid));
}

export async function oneGroup(uid: string, groupId: string, tz?: string): Promise<Group> {
  const [g] = await groupsFor(uid, [groupId], tz);
  if (!g) throw new GroupsError("not_found", 404);
  return g;
}
