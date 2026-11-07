import { LANGS } from "../words";

export type Mark = { letter: "A" | "B" | "C" | "D"; pigment: "lapis" | "vermilion" | "malachite" | "ochre"; glyph: "wave" | "spark" | "leaf" | "crescent" };

export const MARKS: Mark[] = [
  { letter: "A", pigment: "lapis", glyph: "wave" },
  { letter: "B", pigment: "vermilion", glyph: "spark" },
  { letter: "C", pigment: "malachite", glyph: "leaf" },
  { letter: "D", pigment: "ochre", glyph: "crescent" },
];

export type Team = { slot: 0 | 1 | 2 | 3; name: "Lapis" | "Vermilion" | "Malachite" | "Ochre"; pigment: Mark["pigment"] };

export const TEAMS: Team[] = [
  { slot: 0, name: "Lapis", pigment: "lapis" },
  { slot: 1, name: "Vermilion", pigment: "vermilion" },
  { slot: 2, name: "Malachite", pigment: "malachite" },
  { slot: 3, name: "Ochre", pigment: "ochre" },
];

export function team(slot: number | null | undefined): Team | null {
  return slot == null ? null : TEAMS[slot] ?? null;
}

export type TeamStanding = { team: number; points: number; unisons: number; members: number; place?: number };

export type Phase = "lobby" | "question" | "reveal" | "board" | "finale" | "closed";
export type Standing = { player_id: string; nickname: string; points: number };
export type Question = {
  idx: number;
  round: number;
  kind: "pick_word" | "which_language";
  prompt: Record<string, string>;
  options: string[];
  answer: number | null;
  counts: number[] | null;
};
export type Snapshot = {
  server_now: number;
  room: {
    id: string;
    code: string;
    mode?: "open_floor" | "chorus";
    teams?: number;
    phase: Phase;
    idx: number;
    seq: number;
    token_version: number;
    verify_key: string;
    opens_at: number | null;
    closes_at: number | null;
    next_at: number | null;
    paused: boolean;
    locked: boolean;
    school_mode: boolean;
    expires_at: number;
    total: number;
    players: number;
  };
  standings: Standing[];
  team_standings?: TeamStanding[];
  question?: Question;
  answered?: number;
  roster?: { id: string; nickname: string; team_slot?: number | null }[];
  player?: { id: string; nickname: string; removed: boolean; points: number; streak: number; choice: number | null; team_slot?: number | null };
  realtime: { url: string; key: string; topic: string };
  token?: string;
};

export function displayNickname(key: string): string {
  return key
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function langName(code: string): string {
  return LANGS[code]?.name ?? code;
}

export function optionLabel(q: Pick<Question, "kind" | "options">, i: number): string {
  const o = q.options[i] ?? "";
  return q.kind === "which_language" ? langName(o) : o;
}

export type PromptView = { lead: string; word: string; tail: string | null };

export function promptView(q: Pick<Question, "kind" | "prompt">): PromptView {
  if (q.kind === "which_language") return { lead: "Which language is this?", word: q.prompt.word ?? "", tail: null };
  return { lead: "Pick the word for", word: q.prompt.home ?? "", tail: `in ${langName(q.prompt.lang ?? "")}` };
}

export function clockOffset(sentAt: number, receivedAt: number, serverNow: number): number {
  return Math.round(serverNow - (sentAt + receivedAt) / 2);
}

export function secondsLeft(closesAt: number | null, now: number, offset: number, opensAt: number | null = null): number {
  if (!closesAt) return 0;
  const left = Math.max(0, Math.ceil((closesAt - (now + offset)) / 1000));
  return opensAt != null ? Math.min(left, Math.round((closesAt - opensAt) / 1000)) : left;
}

export function joinUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/join/${code}`;
}

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/[^0-9A-HJKMNP-TV-Z]/g, "")
    .slice(0, 6);
}

export const JOIN_ERRORS: Record<string, string> = {
  no_room: "No open room has that code. Check the code on the board.",
  room_full: "This room is full.",
  name_taken: "Someone took that name. Pick another one.",
  locked: "The host locked this room.",
  slow_down: "Too many tries. Wait a minute and try again.",
  code: "Room codes have 6 letters and numbers.",
  nickname: "Pick one of the names shown.",
  offline: "Live rooms are offline right now.",
};

export function joinError(code: string | undefined): string {
  return JOIN_ERRORS[code ?? ""] ?? "That did not work. Try again.";
}

export function rank(standings: Standing[], playerId: string | undefined): number | null {
  const i = standings.findIndex((s) => s.player_id === playerId);
  return i < 0 ? null : i + 1;
}
