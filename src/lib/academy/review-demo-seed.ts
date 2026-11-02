import { dayKey } from "./engine";
import { generateInviteCode } from "./groups";
import { cardId, progressBranch, type LangSystem, type SystemsDoc } from "./lang-systems";
import type { StoredEngineState } from "./mastery";

export const REVIEW_GROUP_NAME = "Review Family";
export const REVIEW_GROUP_KIND = "family";
export const REVIEW_DISPLAY_NAME = "Reviewer";
export const REVIEW_PEER_NAME = "Sam";

const DAY_MS = 86_400_000;
const LEARNED_WORDS = ["one", "two", "three", "four", "five", "red", "blue", "green"];
const REVIEW_DAYS = 5;

export const reviewInviteCode = generateInviteCode;

export function reviewPeerEmail(email: string): string {
  const at = email.indexOf("@");
  return `${email.slice(0, at)}+peer${email.slice(at)}`;
}

export function reviewSystem(now: number): LangSystem {
  return { id: "review-demo", name: "Spanish and French", root: "en", targets: ["es", "fr"], createdAt: now - REVIEW_DAYS * DAY_MS, updatedAt: now, placement: { es: 0, fr: 0 } };
}

export function reviewSystemsDoc(now: number): SystemsDoc {
  return { systems: [reviewSystem(now)], removed: {} };
}

export function reviewProgress(system: LangSystem, now: number, words: readonly string[] = LEARNED_WORDS): StoredEngineState {
  const cards: NonNullable<StoredEngineState["cards"]> = {};
  for (const lang of system.targets) {
    for (const word of words) {
      cards[cardId(lang, word)] = { state: "review", stability: 12, difficulty: 5, due: now + 3 * DAY_MS, lastReview: now - DAY_MS, reps: 3, lapses: 0 };
    }
  }
  const history: NonNullable<NonNullable<StoredEngineState["stats"]>["history"]> = {};
  for (let i = 0; i < REVIEW_DAYS; i++) history[dayKey(now - i * DAY_MS)] = { new: 4, reviews: 12 };
  return {
    cards,
    prof: {},
    settings: { newPerDay: 4, requestRetention: 0.9 },
    stats: { xp: 240, streak: REVIEW_DAYS, lastStudyDay: dayKey(now), history },
  };
}

export function reviewProgressRows(userId: string, now: number, words?: readonly string[]): { user_id: string; branch: string; data: unknown; updated_at: string; fold_key: null }[] {
  const system = reviewSystem(now);
  const updated_at = new Date(now).toISOString();
  return [
    { user_id: userId, branch: "lang-systems", data: reviewSystemsDoc(now), updated_at, fold_key: null },
    { user_id: userId, branch: progressBranch(system), data: reviewProgress(system, now, words), updated_at, fold_key: null },
  ];
}
