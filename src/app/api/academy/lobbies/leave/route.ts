import type { NextRequest, NextResponse } from "next/server";
import { json, preflight } from "@/lib/academy/groups-server";
import { service } from "@/lib/academy/groups-server";
import { authed, lobbyFail, lobbyIdOf } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  try {
    const lobbyId = lobbyIdOf(a.body?.lobbyId);
    const res = await service().rpc("leave_lobby", { p_lobby: lobbyId, p_user: a.uid });
    if (res.error) throw new Error(res.error.message);
    if (res.data === "not_found" || res.data === "not_member") return json({ error: "not_found" }, 404);
    return json({ ok: true, result: res.data });
  } catch (err) {
    return lobbyFail(err, "leave");
  }
}
