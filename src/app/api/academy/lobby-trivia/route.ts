import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail } from "@/lib/academy/lobbies-server";
import { addPoints, inRoom, roomSeats, UUID_RE } from "@/lib/academy/lobby-rooms-server";
import { triviaAllowed, triviaFresh, triviaSet, triviaView, TRIVIA_POINTS, TRIVIA_TTL_MS, type TriviaAction, type TriviaRow } from "@/lib/academy/lobby-trivia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRIVIA = "lobby_trivia";
const ACTIONS: readonly TriviaAction[] = ["save", "open", "answer", "reveal"];

export function OPTIONS(): NextResponse {
  return preflight();
}

async function load(lobbyId: string, now: number): Promise<TriviaRow | null> {
  checkLobby(await service().from(TRIVIA).delete().lt("created_at", new Date(now - TRIVIA_TTL_MS).toISOString()), "trivia purge");
  const row = checkLobby(await service().from(TRIVIA).select("*").eq("lobby_id", lobbyId).maybeSingle(), "trivia read") as TriviaRow | null;
  return row && triviaFresh(row.created_at, now) ? row : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req, false);
  if (!("uid" in a)) return a;
  const lobbyId = new URL(req.url).searchParams.get("lobby") ?? "";
  if (!UUID_RE.test(lobbyId)) return json({ error: "bad_request" }, 400);
  try {
    const s = await roomSeats(lobbyId);
    if (!s) return json({ error: "not_found" }, 404);
    if (!inRoom(a.uid, s)) return json({ error: "unauthorized" }, 403);
    const row = await load(lobbyId, Date.now());
    return json({ trivia: row ? triviaView(row, a.uid, s.host) : null });
  } catch (err) {
    return lobbyFail(err, "trivia get");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const b = a.body ?? {};
  const lobbyId = typeof b.lobbyId === "string" ? b.lobbyId : "";
  const action = b.action as TriviaAction;
  if (!UUID_RE.test(lobbyId) || !ACTIONS.includes(action)) return json({ error: "bad_request" }, 400);
  try {
    const s = await roomSeats(lobbyId);
    if (!s) return json({ error: "not_found" }, 404);
    if (!inRoom(a.uid, s)) return json({ error: "unauthorized" }, 403);
    const now = Date.now();
    const row = await load(lobbyId, now);
    const index = typeof b.index === "number" ? b.index : undefined;
    if (!triviaAllowed(action, row, a.uid, s.host, index)) return json({ error: "not_allowed" }, 403);
    const update = async (patch: Partial<TriviaRow>) => {
      checkLobby(await service().from(TRIVIA).update(patch).eq("lobby_id", lobbyId), `trivia ${action}`);
    };
    if (action === "save") {
      const questions = triviaSet(b.questions);
      if (!questions) return json({ error: "bad_request" }, 400);
      checkLobby(await service().from(TRIVIA).upsert({ lobby_id: lobbyId, questions, current: -1, open: false, answers: {}, created_at: new Date(now).toISOString() }), "trivia save");
      return json({ ok: true, count: questions.length });
    }
    const r = row as TriviaRow;
    if (action === "open") await update({ current: index as number, open: true });
    if (action === "answer") {
      const pick = b.pick;
      const q = r.questions[r.current];
      if (!s.players.includes(a.uid) || typeof pick !== "number" || !Number.isInteger(pick) || pick < 0 || pick >= q.choices.length) return json({ error: "bad_request" }, 400);
      const key = String(r.current);
      if ((r.answers[key] ?? {})[a.uid] !== undefined) return json({ error: "already_answered" }, 409);
      await update({ answers: { ...r.answers, [key]: { ...(r.answers[key] ?? {}), [a.uid]: pick } } });
    }
    if (action === "reveal") {
      const q = r.questions[r.current];
      const points = Object.fromEntries(Object.entries(r.answers[String(r.current)] ?? {}).map(([uid, p]) => [uid, p === q.answer ? TRIVIA_POINTS : 0]));
      await addPoints(lobbyId, points);
      await update({ open: false });
      return json({ ok: true, points });
    }
    return json({ ok: true });
  } catch (err) {
    return lobbyFail(err, "trivia post");
  }
}
