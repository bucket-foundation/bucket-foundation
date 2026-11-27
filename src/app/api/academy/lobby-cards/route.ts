import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail, LOBBIES, PLAYERS, SCREENS } from "@/lib/academy/lobbies-server";
import { CARD_TTL_MS, cardEditable, cardReadAllowed, cardStorable, freshCard, roomCard, sharedCards } from "@/lib/academy/lobby-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARDS = "lobby_cards";
const FAMILY = "lobby_family";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OPTIONS(): NextResponse {
  return preflight();
}

async function seats(lobbyId: string): Promise<{ host: string; status: string; players: string[]; screens: string[] } | null> {
  const lobby = checkLobby(await service().from(LOBBIES).select("host_id,status").eq("id", lobbyId).maybeSingle(), "cards lobby") as { host_id: string; status: string } | null;
  if (!lobby) return null;
  const players = checkLobby(await service().from(PLAYERS).select("user_id").eq("lobby_id", lobbyId), "cards players") as { user_id: string }[];
  const screens = checkLobby(await service().from(SCREENS).select("user_id").eq("lobby_id", lobbyId), "cards screens") as { user_id: string }[];
  return { host: lobby.host_id, status: lobby.status, players: players.map((p) => p.user_id), screens: screens.map((s) => s.user_id) };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  const lobbyId = new URL(req.url).searchParams.get("lobby") ?? "";
  if (!UUID_RE.test(lobbyId)) return json({ error: "bad_request" }, 400);
  try {
    const s = await seats(lobbyId);
    if (!s) return json({ error: "not_found" }, 404);
    if (!cardReadAllowed(a.uid, s.players, s.screens, s.host)) return json({ error: "unauthorized" }, 403);
    const now = Date.now();
    checkLobby(await service().from(CARDS).delete().lt("created_at", new Date(now - CARD_TTL_MS).toISOString()), "cards purge");
    const rows = checkLobby(await service().from(CARDS).select("user_id,card,created_at").eq("lobby_id", lobbyId), "cards read") as { user_id: string; card: unknown; created_at: string }[];
    const family = checkLobby(await service().from(FAMILY).select("share").eq("lobby_id", lobbyId).maybeSingle(), "cards family") as { share: boolean } | null;
    const cards = rows.filter((r) => s.players.includes(r.user_id) && freshCard(r.created_at, now)).flatMap((r) => {
      const card = roomCard(r.card);
      return card ? [{ userId: r.user_id, card: { speaks: card.speaks, learn: card.learn, surprise: card.surprise } }] : [];
    });
    const share = family?.share ?? true;
    return json({ cards: sharedCards(cards, share), share });
  } catch (err) {
    return lobbyFail(err, "cards get");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const lobbyId = typeof a.body?.lobbyId === "string" ? a.body.lobbyId : "";
  if (!UUID_RE.test(lobbyId)) return json({ error: "bad_request" }, 400);
  try {
    const s = await seats(lobbyId);
    if (!s) return json({ error: "not_found" }, 404);
    if (typeof a.body?.share === "boolean") {
      if (a.uid !== s.host) return json({ error: "not_host" }, 403);
      checkLobby(await service().from(FAMILY).upsert({ lobby_id: lobbyId, share: a.body.share, updated_at: new Date().toISOString() }), "cards share");
      return json({ ok: true, share: a.body.share });
    }
    if (!s.players.includes(a.uid)) return json({ error: "unauthorized" }, 403);
    const card = roomCard(a.body?.card);
    if (!card) return json({ error: "bad_request" }, 400);
    if (!cardStorable(card)) return json({ error: "under13_not_stored" }, 403);
    if (!cardEditable(s.status)) return json({ error: "card_locked" }, 409);
    const now = Date.now();
    checkLobby(await service().from(CARDS).delete().lt("created_at", new Date(now - CARD_TTL_MS).toISOString()), "cards purge");
    checkLobby(await service().from(CARDS).upsert({ lobby_id: lobbyId, user_id: a.uid, card, created_at: new Date(now).toISOString() }), "cards write");
    return json({ ok: true });
  } catch (err) {
    return lobbyFail(err, "cards post");
  }
}
