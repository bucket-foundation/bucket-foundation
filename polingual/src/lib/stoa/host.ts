export type HostRoom = { room_id: string; host_token: string; code: string };
export type HostMode = "open_floor" | "chorus";
export type HostSettings = { home: string; targets: string[]; school: boolean; mode: HostMode; teamCount: number };

export const HOMES = ["en", "es", "fr", "de", "pt", "it", "ar", "he", "ja", "zh", "ko", "hi", "ru", "tr"];
export const TARGETS = ["es", "fr", "it", "pt", "de", "nl", "sv", "ru", "pl", "el", "ar", "he", "fa", "hi", "ja", "zh", "ko", "th", "tr", "vi", "en", "la"];

const ERRORS: Record<string, string> = {
  sign_in: "Sign in again to host a room.",
  too_many_rooms: "You already have 3 open rooms. End one first.",
  settings: "Pick at least one language to quiz.",
  no_questions: "No questions fit those languages. Pick another language.",
  offline: "Live rooms are offline right now.",
};

export function hostError(code: string | undefined): string {
  return ERRORS[code ?? ""] ?? "The room did not open. Try again.";
}

export function roomRequest(s: HostSettings) {
  return { product: "polingual", settings: { home: s.home, targets: s.targets }, school_mode: s.school, mode: s.mode, ...(s.mode === "chorus" ? { teams: s.teamCount } : {}) };
}

export function toggledTarget(cur: string[], t: string): string[] {
  return cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 12 ? cur : [...cur, t];
}

export function answeredShare(answered: number | undefined, players: number): number {
  return players ? Math.min(100, Math.round(((answered ?? 0) / players) * 100)) : 0;
}

export function boardStates(reveal: boolean, answer: number | null): ("right" | "dim" | "idle")[] {
  return [0, 1, 2, 3].map((i) => (reveal ? (i === answer ? "right" : "dim") : "idle"));
}

export function nextTeamSlot(slot: number | null | undefined, teams: number): number {
  return ((slot ?? 0) + 1) % teams;
}
