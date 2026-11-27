import { CARD_TTL_MS, type RoomCard } from "./lobby-cards";
import { nameAllowed } from "./groups-names";

export const TEACH_TTL_MS = CARD_TTL_MS;
export const CLIP_MAX_CHARS = 280_000;
export const TEACH_POINTS = 100;
export const TEACH_MIMES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"] as const;
const CHOICE_MAX = 40;
const LANG_RE = /^[a-z]{2,3}$/;

export type TeachStatus = "asked" | "approved" | "ready" | "open" | "done" | "skipped" | "reported";

export interface TeachRow {
  lobby_id: string;
  round: number;
  speaker_id: string;
  status: TeachStatus;
  lang: string | null;
  choices: string[];
  answer: number | null;
  clip: string | null;
  guesses: Record<string, number>;
  created_at: string;
}

export type RecordRefusal = "no_card" | "not_adult" | "not_home_language" | "not_approved";

export function recordRefusal(card: RoomCard | null, lang: string, status: TeachStatus): RecordRefusal | null {
  if (!card) return "no_card";
  if (card.band !== "adult") return "not_adult";
  if (!card.speaks.some((s) => s.lang === lang && s.level === 4)) return "not_home_language";
  if (status !== "approved") return "not_approved";
  return null;
}

export type AccountRefusal = "not_adult_account" | "age_unavailable";

export function accountRefusal(guest: boolean, age: { ok: true; band: string | null } | { ok: false } | null): AccountRefusal | null {
  if (guest) return null;
  if (!age || !age.ok) return "age_unavailable";
  return age.band === "18plus" ? null : "not_adult_account";
}

export function homeLanguages(card: RoomCard | null): string[] {
  if (!card || card.band !== "adult") return [];
  return card.speaks.filter((s) => s.level === 4).map((s) => s.lang);
}

export function teachClip(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > CLIP_MAX_CHARS) return null;
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)(;codecs=[\w.,-]+)?;base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw);
  if (!m || !TEACH_MIMES.includes(m[1] as (typeof TEACH_MIMES)[number]) || m[3].length < 200) return null;
  return raw;
}

export function teachChoices(raw: unknown, answer: unknown): { choices: string[]; answer: number } | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 4) return null;
  const choices = raw.map((c) => (typeof c === "string" ? c.trim().replace(/\s+/g, " ") : ""));
  if (choices.some((c) => !c || c.length > CHOICE_MAX || !nameAllowed(c))) return null;
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) return null;
  if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 0 || answer >= choices.length) return null;
  return { choices, answer };
}

export function teachLang(raw: unknown): string | null {
  return typeof raw === "string" && LANG_RE.test(raw) ? raw : null;
}

export type TeachAction = "ask" | "approve" | "record" | "play" | "guess" | "reveal" | "skip" | "report";

const HOST_ACTIONS: readonly TeachAction[] = ["ask", "approve", "play", "reveal", "skip", "report"];

const FROM: Record<TeachAction, readonly (TeachStatus | "none")[]> = {
  ask: ["none", "done", "skipped", "reported"],
  approve: ["asked"],
  record: ["approved"],
  play: ["ready"],
  guess: ["open"],
  reveal: ["open"],
  skip: ["asked", "approved", "ready", "open"],
  report: ["ready", "open", "done"],
};

export function teachAllowed(action: TeachAction, status: TeachStatus | "none", uid: string, hostId: string, speakerId: string | null): boolean {
  if (!FROM[action].includes(status)) return false;
  if (HOST_ACTIONS.includes(action)) return uid === hostId;
  if (action === "record") return uid === speakerId;
  return uid !== speakerId;
}

export function teachScores(row: Pick<TeachRow, "answer" | "guesses" | "speaker_id">): { points: Record<string, number>; teacherAward: boolean } {
  const points: Record<string, number> = {};
  let right = 0;
  for (const [uid, g] of Object.entries(row.guesses)) {
    if (uid === row.speaker_id) continue;
    const hit = row.answer !== null && g === row.answer;
    points[uid] = hit ? TEACH_POINTS : 0;
    if (hit) right++;
  }
  return { points, teacherAward: right > 0 };
}

export interface TeachView {
  round: number;
  speakerId: string;
  status: TeachStatus;
  lang: string | null;
  choices: string[];
  answer: number | null;
  clip: string | null;
  myGuess: number | null;
  guessed: number;
  teacherAward: boolean | null;
}

export function teachView(row: TeachRow, uid: string, hostId: string, screens: readonly string[]): TeachView {
  const shared = uid === hostId || screens.includes(uid);
  const showClip = (row.status === "open" && shared) || (uid === row.speaker_id && (row.status === "ready" || row.status === "open"));
  const done = row.status === "done";
  return {
    round: row.round,
    speakerId: row.speaker_id,
    status: row.status,
    lang: row.lang,
    choices: row.status === "open" || done || uid === row.speaker_id ? row.choices : [],
    answer: done || uid === row.speaker_id ? row.answer : null,
    clip: showClip ? row.clip : null,
    myGuess: row.guesses[uid] ?? null,
    guessed: Object.keys(row.guesses).length,
    teacherAward: done ? teachScores(row).teacherAward : null,
  };
}

export function teachFresh(createdAt: string, now: number): boolean {
  return now - Date.parse(createdAt) < TEACH_TTL_MS;
}
