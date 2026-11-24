import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail } from "@/lib/academy/lobbies-server";
import { normalizeBlockChange } from "@/lib/academy/lobby-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOCKS = "lobby_chat_blocks";

type BlockRow = { target_user_id: string; name: string; created_at: string };

async function listBlocks(uid: string): Promise<NextResponse> {
  const rows = checkLobby(await service().from(BLOCKS).select("target_user_id,name,created_at").eq("blocker_id", uid).order("created_at"), "blocks read") as BlockRow[];
  return json({ blocks: rows.map((r) => ({ userId: r.target_user_id, name: r.name, at: r.created_at })) });
}

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  try {
    return await listBlocks(a.uid);
  } catch (err) {
    return lobbyFail(err, "blocks");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const change = normalizeBlockChange(a.body, a.uid);
  if (!change) return json({ error: "bad_request" }, 400);
  try {
    if (change.blocked) {
      checkLobby(await service().from(BLOCKS).upsert({ blocker_id: a.uid, target_user_id: change.userId, name: change.name }, { onConflict: "blocker_id,target_user_id", ignoreDuplicates: true }), "block");
    } else {
      checkLobby(await service().from(BLOCKS).delete().eq("blocker_id", a.uid).eq("target_user_id", change.userId), "unblock");
    }
    return await listBlocks(a.uid);
  } catch (err) {
    return lobbyFail(err, "blocks");
  }
}
