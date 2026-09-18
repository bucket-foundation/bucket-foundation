/**
 * FSRS-5 spaced-repetition scheduler. A port of learning/app/js/fsrs.js
 * (the same 19 default weights and the same math) so the Research OS Learn
 * module schedules cards the way the Academy app did, and existing
 * progress blobs keep their meaning.
 */
import type { StoredCard } from "./mastery";

export const FSRS_DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
export const DAY_MS = 86400000;

/** 1 Again, 2 Hard, 3 Good, 4 Easy. */
export type Rating = 1 | 2 | 3 | 4;

export interface Card extends StoredCard {
  state?: "new" | "review" | "relearning" | string;
  scheduledDays?: number;
  firedCredit?: number;
}

const clampD = (d: number) => Math.min(Math.max(d, 1), 10);
const clampS = (s: number) => Math.max(s, 0.01);

export class FSRS {
  w: number[];
  requestRetention = 0.9;
  maximumInterval = 3650;

  constructor(weights?: number[]) {
    this.w = weights ?? FSRS_DEFAULT_W;
  }

  /** Retrievability after t days at stability S. */
  retrievability(t: number, S: number): number {
    if (S <= 0) return 0;
    return Math.pow(1 + FACTOR * (t / S), DECAY);
  }

  /** Interval in days to the next review at the requested retention. */
  interval(S: number): number {
    const r = this.requestRetention;
    let ivl = (S / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
    ivl = Math.max(1, Math.round(ivl));
    return Math.min(ivl, this.maximumInterval);
  }

  initStability(g: Rating): number {
    return clampS(this.w[g - 1]);
  }

  initDifficulty(g: Rating): number {
    return clampD(this.w[4] - Math.exp(this.w[5] * (g - 1)) + 1);
  }

  nextDifficulty(D: number, g: Rating): number {
    const delta = -this.w[6] * (g - 3);
    let next = D + delta * ((10 - D) / 9);
    const d0easy = this.w[4] - Math.exp(this.w[5] * 3) + 1;
    next = this.w[7] * d0easy + (1 - this.w[7]) * next;
    return clampD(next);
  }

  stabilityRecall(D: number, S: number, R: number, g: Rating): number {
    const hard = g === 2 ? this.w[15] : 1;
    const easy = g === 4 ? this.w[16] : 1;
    const inc = Math.exp(this.w[8]) * (11 - D) * Math.pow(S, -this.w[9]) * (Math.exp(this.w[10] * (1 - R)) - 1) * hard * easy;
    return clampS(S * (1 + inc));
  }

  stabilityForget(D: number, S: number, R: number): number {
    const sf = this.w[11] * Math.pow(D, -this.w[12]) * (Math.pow(S + 1, this.w[13]) - 1) * Math.exp(this.w[14] * (1 - R));
    return clampS(Math.min(sf, S));
  }

  /** Apply a rating to a card and return a new card. */
  review(card: Card | null | undefined, g: Rating, now: number = Date.now()): Card {
    const out: Card = { ...(card ?? {}) };
    if (!card || card.state === "new" || card.stability == null) {
      out.stability = this.initStability(g);
      out.difficulty = this.initDifficulty(g);
      out.reps = 1;
      out.lapses = 0;
    } else {
      const elapsedDays = Math.max(0, (now - (card.lastReview || now)) / DAY_MS);
      const R = this.retrievability(elapsedDays, card.stability);
      const D = card.difficulty ?? this.initDifficulty(3);
      if (g === 1) {
        out.stability = this.stabilityForget(D, card.stability, R);
        out.lapses = (card.lapses || 0) + 1;
      } else {
        out.stability = this.stabilityRecall(D, card.stability, R, g);
      }
      out.difficulty = this.nextDifficulty(D, g);
      out.reps = (card.reps || 0) + 1;
    }
    out.state = g === 1 ? "relearning" : "review";
    out.lastReview = now;
    const ivl = g === 1 ? 1 : this.interval(out.stability as number);
    out.scheduledDays = ivl;
    out.due = now + ivl * DAY_MS;
    return out;
  }

  /** Mastery proxy in [0,1] from stability in days; about 30 days stable reads as mastered. */
  mastery(card: Card | null | undefined): number {
    if (!card || card.stability == null) return 0;
    const m = 1 - Math.exp(-card.stability / 21);
    return Math.max(0, Math.min(1, m));
  }
}
