import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { nameAllowed } from "@/lib/academy/groups-names";
import { normalizeDisplayName } from "@/lib/academy/groups";
import { blocksTouching, clientIp, NAME_NOT_ALLOWED, service } from "@/lib/academy/groups-server";
import { setupGames, CREATE_PER_MINUTE, generateSeed, hostedSince, MAX_HOSTED, nativePlayable, WEB_CLIENT_HEADER, normalizeLobbyConfig, OPEN_WINDOW_MS, openLobbies } from "@/lib/academy/lobbies";
import { botsEnabled } from "@/lib/academy/lobby-bots";
import { ensureStanding } from "@/lib/academy/lobby-bots-server";
import { addPlayer, authed, limited, checkLobby, insertLobby, LOBBIES, lobbyFail, lobbyState, namedPlayersOf, openRows } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  try {
    const now = Date.now();
    const bots = botsEnabled();
    const standing = bots ? await ensureStanding(now) : [];
    const [{ lobbies, players }, blocks] = await Promise.all([openRows(a.uid, new Date(now - OPEN_WINDOW_MS).toISOString()), blocksTouching(a.uid)]);
    const extra = standing.filter((s) => !lobbies.some((l) => l.id === s.id));
    const all = [...lobbies, ...extra];
    const allPlayers = extra.length ? [...players, ...(await namedPlayersOf(extra.map((l) => l.id)))] : players;
    const web = new URL(req.url).searchParams.get("client") === "web" || req.headers.get(WEB_CLIENT_HEADER) === "web";
    const shown = web ? all : all.filter(nativePlayable);
    return json({ lobbies: openLobbies(shown, allPlayers, blocks, a.uid, now, bots), bots, games: setupGames() });
  } catch (err) {
    return lobbyFail(err, "list");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const config = normalizeLobbyConfig(a.body);
  const displayName = normalizeDisplayName(a.body?.displayName);
  if (!config || !displayName) return json({ error: "bad_request" }, 400);
  if (!nameAllowed(displayName) || !nameAllowed(config.name)) return json({ error: NAME_NOT_ALLOWED }, 422);
  try {
    if ((await limited(`create:user:${a.uid}`, CREATE_PER_MINUTE)) || (await limited(`create:ip:${clientIp(req)}`, CREATE_PER_MINUTE * 3))) return json({ error: "rate_limited" }, 429);
    const hosted = checkLobby(await service().from(LOBBIES).select("id").eq("host_id", a.uid).neq("status", "done").gte("created_at", hostedSince(Date.now())), "hosted") as unknown[];
    if (hosted.length >= MAX_HOSTED) return json({ error: "hosted_limit" }, 409);
    const lobby = await insertLobby({ host_id: a.uid, name: config.name, game: config.game, root: config.root, targets: config.targets, seed: generateSeed(), listed: config.listed, bot_fill: botsEnabled() && a.body?.fillBots === true, rounds: config.rounds, round_seconds: config.roundSeconds, ...(config.revealSeconds ? { reveal_seconds: config.revealSeconds } : {}), ...(config.playlist ? { playlist: config.playlist, mix: config.mix } : {}) });
    try {
      await addPlayer(lobby.id, a.uid, displayName);
    } catch (err) {
      await service().from(LOBBIES).delete().eq("id", lobby.id);
      throw err;
    }
    return json({ lobby: await lobbyState(lobby, a.uid, Date.now()) });
  } catch (err) {
    return lobbyFail(err, "create");
  }
}
