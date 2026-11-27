import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail } from "@/lib/academy/lobbies-server";
import { addPoints, claimed, inRoom, insertOnce, purgeRounds, roomSeats, TRIVIA, TRIVIA_ANSWERS, triviaAnswers, UUID_RE } from "@/lib/academy/lobby-rooms-server";
import { triviaAllowed, triviaFresh, triviaSet, triviaView, TRIVIA_POINTS, type TriviaAction, type TriviaRow } from "@/lib/academy/lobby-trivia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: readonly TriviaAction[] = ["save", "open", "answer", "reveal"];

export function OPTIONS(): NextResponse {
  return preflight();
}

async function load(lobbyId: string, now: number): Promise<TriviaRow | null> {
  await purgeRounds(now);
  const row = checkLobby(await service().from(TRIVIA).select("lobby_id,questions,current,open,created_at").eq("lobby_id", lobbyId).maybeSingle(), "trivia read") as Omit<TriviaRow, "answers"> | null;
  return row && triviaFresh(row.created_at, now) ? { ...row, answers: await triviaAnswers(lobbyId) } : null;
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
    if (action === "save") {
      const questions = triviaSet(b.questions);
      if (!questions) return json({ error: "bad_request" }, 400);
      checkLobby(await service().from(TRIVIA_ANSWERS).delete().eq("lobby_id", lobbyId), "trivia reset");
      checkLobby(await service().from(TRIVIA).upsert({ lobby_id: lobbyId, questions, current: -1, open: false, created_at: new Date(now).toISOString() }), "trivia save");
      return json({ ok: true, count: questions.length });
    }
    const r = row as TriviaRow;
    if (action === "open") {
      const ok = await claimed(await service().from(TRIVIA).update({ current: index as number, open: true }).eq("lobby_id", lobbyId).eq("current", r.current).eq("open", false).select("lobby_id"), "trivia open");
      if (!ok) return json({ error: "not_allowed" }, 409);
    }
    if (action === "answer") {
      const pick = b.pick;
      const q = r.questions[r.current];
      if (!s.players.includes(a.uid) || typeof pick !== "number" || !Number.isInteger(pick) || pick < 0 || pick >= q.choices.length) return json({ error: "bad_request" }, 400);
      if (!(await insertOnce(TRIVIA_ANSWERS, { lobby_id: lobbyId, question: r.current, user_id: a.uid, pick }, "trivia answer"))) return json({ error: "already_answered" }, 409);
    }
    if (action === "reveal") {
      const ok = await claimed(await service().from(TRIVIA).update({ open: false }).eq("lobby_id", lobbyId).eq("current", r.current).eq("open", true).select("lobby_id"), "trivia reveal");
      if (!ok) return json({ error: "not_allowed" }, 409);
      const q = r.questions[r.current];
      const picks = (await triviaAnswers(lobbyId))[String(r.current)] ?? {};
      const points = Object.fromEntries(Object.entries(picks).map(([uid, p]) => [uid, p === q.answer ? TRIVIA_POINTS : 0]));
      await addPoints(lobbyId, points);
      return json({ ok: true, points });
    }
    return json({ ok: true });
  } catch (err) {
    return lobbyFail(err, "trivia post");
  }
}
