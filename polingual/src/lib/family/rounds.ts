import type { TeachAction, TeachView } from "@academy/lobby-teach";
import type { TriviaAction, TriviaQuestion, TriviaView } from "@academy/lobby-trivia";
import { publicPlayback, type ClipLicence } from "@academy/voice-atlas";

export type { TeachView, TriviaView, TriviaQuestion };
export type ScreenRole = "tv" | "shared" | "phone";
type Fetch = typeof fetch;

export function screenRole(uid: string, hostId: string, screens: readonly string[]): ScreenRole {
  if (screens.includes(uid)) return "tv";
  if (uid === hostId && screens.length === 0) return "shared";
  return "phone";
}

export function tvPlayable(clip: { licence?: ClipLicence } | null | undefined, room: boolean): boolean {
  if (!clip) return false;
  if (clip.licence === "family-room") return room;
  return publicPlayback(clip.licence);
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json", "x-polingual-client": "web" };
}

async function call<T>(f: Fetch, path: string, token: string, body?: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const r = await f(path, body ? { method: "POST", headers: headers(token), body: JSON.stringify(body) } : { headers: headers(token), cache: "no-store" });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return r.ok ? { ok: true, data: data as T } : { ok: false, error: typeof data.error === "string" ? data.error : "sync_unavailable" };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export const TEACH_PATH = "/api/academy/lobby-teach";
export const TRIVIA_PATH = "/api/academy/lobby-trivia";

export function fetchTeach(f: Fetch, token: string, lobbyId: string) {
  return call<{ teach: TeachView | null }>(f, `${TEACH_PATH}?lobby=${encodeURIComponent(lobbyId)}`, token);
}

export function teachAct(f: Fetch, token: string, lobbyId: string, action: TeachAction, extra: Record<string, unknown> = {}) {
  return call<{ ok: true; points?: Record<string, number>; teacherAward?: boolean }>(f, TEACH_PATH, token, { lobbyId, action, ...extra });
}

export function fetchTrivia(f: Fetch, token: string, lobbyId: string) {
  return call<{ trivia: TriviaView | null }>(f, `${TRIVIA_PATH}?lobby=${encodeURIComponent(lobbyId)}`, token);
}

export function triviaAct(f: Fetch, token: string, lobbyId: string, action: TriviaAction, extra: Record<string, unknown> = {}) {
  return call<{ ok: true }>(f, TRIVIA_PATH, token, { lobbyId, action, ...extra });
}

export const TEACH_ERRORS: Record<string, string> = {
  no_card: "Fill your player card first. Seats under 13 do not record.",
  not_adult: "Recording is for adults. Pass the phone to a grown-up.",
  not_home_language: "Pick a language you marked as a home language.",
  not_approved: "The host approves the speaker on the TV first.",
  not_allowed: "That step is not open right now.",
  offline: "You are offline. Check the connection and try again.",
};

export function teachError(code: string): string {
  return TEACH_ERRORS[code] ?? "That did not save. Try again.";
}

export function blankQuestion(): TriviaQuestion {
  return { prompt: "", choices: ["", ""], answer: 0 };
}
