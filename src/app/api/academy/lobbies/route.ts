import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { nameAllowed } from "@/lib/academy/groups-names";
import { normalizeDisplayName } from "@/lib/academy/groups";
import { blocksTouching, NAME_NOT_ALLOWED, service } from "@/lib/academy/groups-server";
import { generateSeed, MAX_HOSTED, normalizeLobbyConfig, OPEN_WINDOW_MS, openLobbies } from "@/lib/academy/lobbies";
import { addPlayer, authed, checkLobby, insertLobby, LOBBIES, lobbyFail, lobbyState, openRows } from "@/lib/academy/lobbies-server";

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
    const [{ lobbies, players }, blocks] = await Promise.all([openRows(a.uid, new Date(now - OPEN_WINDOW_MS).toISOString()), blocksTouching(a.uid)]);
    return json({ lobbies: openLobbies(lobbies, players, blocks, a.uid, now) });
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
    const hosted = checkLobby(await service().from(LOBBIES).select("id").eq("host_id", a.uid).neq("status", "done"), "hosted") as unknown[];
    if (hosted.length >= MAX_HOSTED) return json({ error: "hosted_limit" }, 409);
    const lobby = await insertLobby({ host_id: a.uid, name: config.name, root: config.root, targets: config.targets, seed: generateSeed(), listed: config.listed, rounds: config.rounds, round_seconds: config.roundSeconds });
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
