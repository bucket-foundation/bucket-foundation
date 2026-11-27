import type { NextRequest, NextResponse } from "next/server";
import { configured, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";
import { readAgeBand } from "@/lib/research-os/learn-gate";
import { basePoints, claimOpen, cohortFor, DAILY_CAP, leagueAllowed, nextTier, previousWeekId, ranked, TIER_NAMES, weekOf } from "@/lib/academy/league";

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
    const lobby = data<{ status: "lobby" | "playing" | "done"; started_at: string | null; rounds: number; round_seconds: number; reveal_seconds?: number } | null>(await service().from("lobbies").select("status,started_at,rounds,round_seconds,reveal_seconds").eq("id", lobbyId).maybeSingle(), "lobby");
    if (!lobby) return json({ error: "not_found" }, 404);
    const humans = data<{ user_id: string }[]>(await service().from("lobby_players").select("user_id").eq("lobby_id", lobbyId).eq("is_bot", false), "humans");
    if (!claimOpen(lobby, humans.length, now)) return json({ error: "not_finished" }, 409);
    const answers = data<{ correct: boolean }[]>(await service().from("lobby_answers").select("correct").eq("lobby_id", lobbyId).eq("user_id", uid), "answers");
    if (!answers.length) return json({ error: "not_found" }, 404);
    const me = await membership(uid, now);
    const day = new Date(now).toISOString().slice(0, 10);
    const points = data<number>(await service().rpc("league_claim", { p_week: me.week, p_user: uid, p_key: `${lobbyId}|${lobby.started_at}`, p_day: day, p_points: basePoints(answers), p_cap: DAILY_CAP }), "claim");
    if (points < 0) return json({ ok: true, added: 0, points: me.points });
    return json({ ok: true, added: points, points: me.points + points });
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
