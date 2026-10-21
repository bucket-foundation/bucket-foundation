import { isAspectId, isDirectionId, type AspectId, type DirectionId } from "./directions";

export const NOTE_MAX = 1000;
export const ROUND_MAX = 3;

export interface Answer {
  aspect: AspectId;
  a: DirectionId;
  b: DirectionId;
  round: number;
  left: DirectionId;
  choice: DirectionId | null;
  note: string;
  at: string;
}

export function orderPair(x: DirectionId, y: DirectionId): [DirectionId, DirectionId] {
  return x < y ? [x, y] : [y, x];
}

export function answerKey(v: Pick<Answer, "aspect" | "a" | "b" | "round">): string {
  return `${v.aspect}:${v.a}:${v.b}:${v.round}`;
}

export function normalizeNote(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\r\n/g, "\n").trim().slice(0, NOTE_MAX);
}

export function parseAnswer(raw: unknown): Answer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isAspectId(r.aspect) || !isDirectionId(r.a) || !isDirectionId(r.b) || !isDirectionId(r.left)) return null;
  if (r.a >= r.b) return null;
  if (r.left !== r.a && r.left !== r.b) return null;
  if (!Number.isInteger(r.round) || (r.round as number) < 0 || (r.round as number) > ROUND_MAX) return null;
  const choice = r.choice === null || r.choice === undefined ? null : r.choice;
  if (choice !== null && choice !== r.a && choice !== r.b) return null;
  if (r.note !== undefined && r.note !== null && typeof r.note !== "string") return null;
  if (typeof r.note === "string" && r.note.length > NOTE_MAX * 4) return null;
  const at = typeof r.at === "string" && !Number.isNaN(Date.parse(r.at)) ? new Date(r.at).toISOString() : new Date().toISOString();
  return { aspect: r.aspect, a: r.a, b: r.b, round: r.round as number, left: r.left, choice: choice as DirectionId | null, note: normalizeNote(r.note), at };
}

export function mergeAnswers(...lists: Answer[][]): Answer[] {
  const byKey = new Map<string, Answer>();
  for (const list of lists) {
    for (const a of list) {
      const k = answerKey(a);
      const prev = byKey.get(k);
      if (!prev || prev.at <= a.at) byKey.set(k, a);
    }
  }
  return Array.from(byKey.values()).sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
}
