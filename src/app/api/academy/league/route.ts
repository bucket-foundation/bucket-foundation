import type { NextRequest, NextResponse } from "next/server";
import { configured, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { readAgeBand } from "@/lib/research-os/learn-gate";
import { capped, cohortFor, leagueAllowed, nextTier, previousWeekId, ranked, TIER_NAMES, weekOf } from "@/lib/academy/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Member = { user_id: string; cohort: number; tier: number; points: number };

function data<T>(res: { data: unknown; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export function OPTIONS(): NextResponse {
  return preflight();
}

async function gate(req: NextRequest): Promise<string | NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const band = await readAgeBand(uid);
  if (!band.ok) return json({ error: "consent_unavailable" }, 503);
  if (!leagueAllowed(band.band)) return json({ error: "not_eligible" }, 403);
  return uid;
}

async function membership(uid: string, now: number): Promise<Member & { week: string }> {
  const week = weekOf(now);
  const mine = data<Member | null>(await service().from("league_members").select("user_id,cohort,tier,points").eq("week_id", week.id).eq("user_id", uid).maybeSingle(), "member");
  if (mine) return { ...mine, week: week.id };
  data(await service().from("league_weeks").upsert({ id: week.id, starts_at: week.startsAt, ends_at: week.endsAt }, { onConflict: "id", ignoreDuplicates: true }), "week");
  const prev = previousWeekId(week.id);
  const last = data<Member | null>(await service().from("league_members").select("user_id,cohort,tier,points").eq("week_id", prev).eq("user_id", uid).maybeSingle(), "last");
  let tier = 1;
  if (last) {
    const peers = data<Member[]>(await service().from("league_members").select("user_id,cohort,tier,points").eq("week_id", prev).eq("tier", last.tier).eq("cohort", last.cohort), "peers");
    const order = ranked(peers);
    tier = nextTier({ tier: last.tier, rank: order.findIndex((p) => p.user_id === uid) + 1, size: order.length });
  }
  const seats = data<{ cohort: number }[]>(await service().from("league_members").select("cohort").eq("week_id", week.id).eq("tier", tier), "seats");
  const counts = new Map<number, number>();
  for (const s of seats) counts.set(s.cohort, (counts.get(s.cohort) ?? 0) + 1);
  const row = { week_id: week.id, user_id: uid, cohort: cohortFor(counts), tier, points: 0 };
  data(await service().from("league_members").upsert(row, { onConflict: "week_id,user_id", ignoreDuplicates: true }), "join");
  return { ...row, week: week.id };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const uid = await gate(req);
  if (typeof uid !== "string") return uid;
  const body = await readBody(req);
  const lobbyId = typeof body?.lobbyId === "string" && UUID_RE.test(body.lobbyId) ? body.lobbyId : null;
  if (!lobbyId) return json({ error: "bad_request" }, 400);
  try {
    const now = Date.now();
    const lobby = data<{ started_at: string | null } | null>(await service().from("lobbies").select("started_at").eq("id", lobbyId).maybeSingle(), "lobby");
    if (!lobby?.started_at) return json({ error: "not_found" }, 404);
    const answers = data<{ points: number }[]>(await service().from("lobby_answers").select("points").eq("lobby_id", lobbyId).eq("user_id", uid), "answers");
    if (!answers.length) return json({ error: "not_found" }, 404);
    const me = await membership(uid, now);
    const day = new Date(now).toISOString().slice(0, 10);
    const today = data<{ points: number }[]>(await service().from("league_claims").select("points").eq("user_id", uid).eq("day", day), "today");
    const points = capped(answers.reduce((s, a) => s + a.points, 0), today.reduce((s, c) => s + c.points, 0));
    const claim = await service().from("league_claims").insert({ user_id: uid, game_key: `${lobbyId}|${lobby.started_at}`, week_id: me.week, day, points });
    if (claim.error) {
      if (/duplicate key|unique/i.test(claim.error.message)) return json({ ok: true, added: 0, points: me.points });
      throw new Error(`claim: ${claim.error.message}`);
    }
    const total = data<number | null>(await service().rpc("league_add_points", { p_week: me.week, p_user: uid, p_points: points }), "add");
    return json({ ok: true, added: points, points: total ?? me.points + points });
  } catch (err) {
    console.error("[academy/league] post:", err instanceof Error ? err.message : err);
    return json({ error: "sync_unavailable" }, 503);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await gate(req);
  if (typeof uid !== "string") return uid;
  try {
    const me = await membership(uid, Date.now());
    const peers = data<Member[]>(await service().from("league_members").select("user_id,cohort,tier,points").eq("week_id", me.week).eq("tier", me.tier).eq("cohort", me.cohort), "board");
    const ids = peers.map((p) => p.user_id);
    const names = ids.length ? data<{ user_id: string; handle: string | null; display_name: string | null }[]>(await service().from("academy_profiles").select("user_id,handle,display_name").eq("is_public", true).in("user_id", ids), "names") : [];
    const name = new Map(names.map((n) => [n.user_id, n.display_name || n.handle || "Player"]));
    const board = ranked(peers).map((p, i) => ({ rank: i + 1, name: p.user_id === uid ? "You" : name.get(p.user_id) ?? `Player ${i + 1}`, points: p.points, me: p.user_id === uid }));
    return json({ week: me.week, tier: me.tier, tierName: TIER_NAMES[me.tier - 1], board });
  } catch (err) {
    console.error("[academy/league] get:", err instanceof Error ? err.message : err);
    return json({ error: "sync_unavailable" }, 503);
  }
}
