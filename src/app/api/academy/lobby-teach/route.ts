import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, service } from "@/lib/academy/groups-server";
import { authed, checkLobby, lobbyFail } from "@/lib/academy/lobbies-server";
import { addPoints, inRoom, roomSeats, seatCard, UUID_RE } from "@/lib/academy/lobby-rooms-server";
import { recordRefusal, teachAllowed, teachChoices, teachClip, teachFresh, teachLang, teachScores, teachView, TEACH_TTL_MS, type TeachAction, type TeachRow } from "@/lib/academy/lobby-teach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEACH = "lobby_teach";
const ACTIONS: readonly TeachAction[] = ["ask", "approve", "record", "play", "guess", "reveal", "skip", "report"];

export function OPTIONS(): NextResponse {
  return preflight();
}

async function purge(now: number): Promise<void> {
  checkLobby(await service().from(TEACH).delete().lt("created_at", new Date(now - TEACH_TTL_MS).toISOString()), "teach purge");
}

async function latest(lobbyId: string, now: number): Promise<TeachRow | null> {
  const rows = checkLobby(await service().from(TEACH).select("*").eq("lobby_id", lobbyId).order("round", { ascending: false }).limit(1), "teach read") as TeachRow[];
  return rows[0] && teachFresh(rows[0].created_at, now) ? rows[0] : null;
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
    await purge(now);
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
    await purge(now);
    const row = await latest(lobbyId, now);
    const speaker = action === "ask" ? (typeof b.speakerId === "string" ? b.speakerId : "") : row?.speaker_id ?? null;
    if (action === "ask" && !s.players.includes(speaker ?? "")) return json({ error: "bad_request" }, 400);
    if (!teachAllowed(action, row?.status ?? "none", a.uid, s.host, speaker)) return json({ error: "not_allowed" }, 403);
    const update = async (patch: Partial<TeachRow>) => {
      checkLobby(await service().from(TEACH).update(patch).eq("lobby_id", lobbyId).eq("round", (row as TeachRow).round), `teach ${action}`);
    };
    if (action === "ask") {
      const lang = teachLang(b.lang);
      const round = row ? row.round + 1 : 0;
      checkLobby(await service().from(TEACH).upsert({ lobby_id: lobbyId, round, speaker_id: speaker, status: "asked", lang, choices: [], answer: null, clip: null, guesses: {}, created_at: new Date(now).toISOString() }), "teach ask");
      return json({ ok: true, round });
    }
    const r = row as TeachRow;
    if (action === "approve") await update({ status: "approved" });
    if (action === "record") {
      const lang = teachLang(b.lang) ?? r.lang;
      if (!lang) return json({ error: "bad_request" }, 400);
      const refusal = recordRefusal(await seatCard(lobbyId, a.uid), lang, r.status);
      if (refusal) return json({ error: refusal }, 403);
      const clip = teachClip(b.clip);
      const picked = teachChoices(b.choices, b.answer);
      if (!clip || !picked) return json({ error: "bad_request" }, 400);
      await update({ status: "ready", lang, clip, choices: picked.choices, answer: picked.answer });
    }
    if (action === "play") await update({ status: "open" });
    if (action === "guess") {
      const g = b.guess;
      if (!s.players.includes(a.uid) || typeof g !== "number" || !Number.isInteger(g) || g < 0 || g >= r.choices.length) return json({ error: "bad_request" }, 400);
      if (a.uid in r.guesses) return json({ error: "already_guessed" }, 409);
      await update({ guesses: { ...r.guesses, [a.uid]: g } });
    }
    if (action === "reveal") {
      const { points, teacherAward } = teachScores(r);
      await addPoints(lobbyId, points);
      await update({ status: "done", clip: null });
      return json({ ok: true, points, teacherAward });
    }
    if (action === "skip") await update({ status: "skipped", clip: null });
    if (action === "report") {
      console.warn(`[academy/lobby-teach] clip reported lobby=${lobbyId} round=${r.round}`);
      await update({ status: "reported", clip: null });
    }
    return json({ ok: true });
  } catch (err) {
    return lobbyFail(err, "teach post");
  }
}
