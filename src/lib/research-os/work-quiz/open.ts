import { LIMIT_SEC } from "./generate";
import { GRACE_MS } from "./grade";

export const OPEN_WINDOW_MS = Math.max(...Object.values(LIMIT_SEC)) * 1000 + GRACE_MS;

export function stillOpen(row: { issued_at: string; answered_at: string | null; question: { limitSec: number } }, now: Date): boolean {
  if (row.answered_at) return false;
  return now.getTime() - new Date(row.issued_at).getTime() < row.question.limitSec * 1000 + GRACE_MS;
}
