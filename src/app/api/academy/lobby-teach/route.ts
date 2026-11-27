import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail } from "@/lib/academy/lobbies-server";
import { addPoints, claimed, guestRequest, inRoom, insertOnce, purgeRounds, roomSeats, seatCard, TEACH, TEACH_GUESSES, teachGuesses, UUID_RE } from "@/lib/academy/lobby-rooms-server";
import { accountRefusal, recordRefusal, teachAllowed, teachChoices, teachClip, teachFresh, teachLang, teachScores, teachView, type TeachAction, type TeachRow } from "@/lib/academy/lobby-teach";
import { readAgeBand } from "@/lib/research-os/learn-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: readonly TeachAction[] = ["ask", "approve", "record", "play", "guess", "reveal", "skip", "report"];

export function OPTIONS(): NextResponse {
  return preflight();
}

async function latest(lobbyId: string, now: number): Promise<TeachRow | null> {
  const rows = checkLobby(await service().from(TEACH).select("lobby_id,round,speaker_id,status,lang,choices,answer,clip,created_at").eq("lobby_id", lobbyId).order("round", { ascending: false }).limit(1), "teach read") as Omit<TeachRow, "guesses">[];
  const row = rows[0];
  if (!row || !teachFresh(row.created_at, now)) return null;
  return { ...row, guesses: await teachGuesses(lobbyId, row.round) };
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
    const now = Date.now();
    await purgeRounds(now);
    const row = await latest(lobbyId, now);
    return json({ teach: row ? teachView(row, a.uid, s.host, s.screens) : null });
  } catch (err) {
    return lobbyFail(err, "teach get");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const b = a.body ?? {};
  const lobbyId = typeof b.lobbyId === "string" ? b.lobbyId : "";
  const action = b.action as TeachAction;
  if (!UUID_RE.test(lobbyId) || !ACTIONS.includes(action)) return json({ error: "bad_request" }, 400);
  try {
    const s = await roomSeats(lobbyId);
    if (!s) return json({ error: "not_found" }, 404);
    if (!inRoom(a.uid, s)) return json({ error: "unauthorized" }, 403);
    const now = Date.now();
    await purgeRounds(now);
    const row = await latest(lobbyId, now);
    const speaker = action === "ask" ? (typeof b.speakerId === "string" ? b.speakerId : "") : row?.speaker_id ?? null;
    if (action === "ask" && !s.players.includes(speaker ?? "")) return json({ error: "bad_request" }, 400);
    if (!teachAllowed(action, row?.status ?? "none", a.uid, s.host, speaker)) return json({ error: "not_allowed" }, 403);
    const move = async (from: TeachRow["status"], patch: Partial<TeachRow>) =>
      claimed(await service().from(TEACH).update(patch).eq("lobby_id", lobbyId).eq("round", (row as TeachRow).round).eq("status", from).select("round"), `teach ${action}`);
    if (action === "ask") {
      const round = row ? row.round + 1 : 0;
      const fresh = await insertOnce(TEACH, { lobby_id: lobbyId, round, speaker_id: speaker, status: "asked", lang: teachLang(b.lang), choices: [], answer: null, clip: null, created_at: new Date(now).toISOString() }, "teach ask");
      return fresh ? json({ ok: true, round }) : json({ error: "not_allowed" }, 409);
    }
    const r = row as TeachRow;
    if (action === "approve" && !(await move("asked", { status: "approved" }))) return json({ error: "not_allowed" }, 409);
    if (action === "record") {
      const lang = teachLang(b.lang) ?? r.lang;
      if (!lang) return json({ error: "bad_request" }, 400);
      const guest = guestRequest(req.headers.get("authorization"));
      const refusal = recordRefusal(await seatCard(lobbyId, a.uid), lang, r.status) ?? accountRefusal(guest, guest ? null : await readAgeBand(a.uid).catch(() => ({ ok: false as const })));
      if (refusal) return json({ error: refusal }, 403);
      const clip = teachClip(b.clip);
      const picked = teachChoices(b.choices, b.answer);
      if (!clip || !picked) return json({ error: "bad_request" }, 400);
      if (!(await move("approved", { status: "ready", lang, clip, choices: picked.choices, answer: picked.answer }))) return json({ error: "not_allowed" }, 409);
    }
    if (action === "play" && !(await move("ready", { status: "open" }))) return json({ error: "not_allowed" }, 409);
    if (action === "guess") {
      const g = b.guess;
      if (!s.players.includes(a.uid) || typeof g !== "number" || !Number.isInteger(g) || g < 0 || g >= r.choices.length) return json({ error: "bad_request" }, 400);
      if (!(await insertOnce(TEACH_GUESSES, { lobby_id: lobbyId, round: r.round, user_id: a.uid, guess: g }, "teach guess"))) return json({ error: "already_guessed" }, 409);
    }
    if (action === "reveal") {
      if (!(await move("open", { status: "done", clip: null }))) return json({ error: "not_allowed" }, 409);
      const { points, teacherAward } = teachScores({ ...r, guesses: await teachGuesses(lobbyId, r.round) });
      await addPoints(lobbyId, points);
      return json({ ok: true, points, teacherAward });
    }
    if (action === "skip" && !(await move(r.status, { status: "skipped", clip: null }))) return json({ error: "not_allowed" }, 409);
    if (action === "report") {
      if (!(await move(r.status, { status: "reported", clip: null }))) return json({ error: "not_allowed" }, 409);
      console.warn(`[academy/lobby-teach] clip reported lobby=${lobbyId} round=${r.round}`);
    }
    return json({ ok: true });
  } catch (err) {
    return lobbyFail(err, "teach post");
  }
}
