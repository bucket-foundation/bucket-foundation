/* Bucket Academy, FSRS-5 spaced-repetition scheduler (vanilla JS).
 * Faithful reimplementation of the Free Spaced Repetition Scheduler memory model
 * (Difficulty / Stability / Retrievability). Algorithm: open MIT lineage (ts-fsrs /
 * py-fsrs); reimplemented here so the app has zero build step. Decision DECISIONS.md#3:
 * FSRS-6 target retention 0.90 (0.95 exam-sprint); we ship FSRS-5 math (19 params).
 */
(function (global) {
  "use strict";

  // FSRS-5 default weights (w0..w18).
  const DEFAULT_W = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
    2.9898, 0.51655, 0.6621,
  ];
  const DECAY = -0.5;
  const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // 0.2345679...
  const DAY = 86400000;

  const clampD = (d) => Math.min(Math.max(d, 1), 10);
  const clampS = (s) => Math.max(s, 0.01);

  // Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  function FSRS(weights) {
    this.w = weights || DEFAULT_W;
    this.requestRetention = 0.9;
    this.maximumInterval = 3650;
  }

  // Retrievability after t days at stability S.
  FSRS.prototype.retrievability = function (t, S) {
    if (S <= 0) return 0;
    return Math.pow(1 + FACTOR * (t / S), DECAY);
  };

  // Interval (days) to next review at the requested retention.
  FSRS.prototype.interval = function (S) {
    const r = this.requestRetention;
    let ivl = (S / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
    ivl = Math.max(1, Math.round(ivl));
    return Math.min(ivl, this.maximumInterval);
  };

  FSRS.prototype.initStability = function (g) {
    return clampS(this.w[g - 1]);
  };
  FSRS.prototype.initDifficulty = function (g) {
    return clampD(this.w[4] - Math.exp(this.w[5] * (g - 1)) + 1);
  };
  FSRS.prototype.nextDifficulty = function (D, g) {
    const delta = -this.w[6] * (g - 3);
    let next = D + delta * ((10 - D) / 9); // linear damping
    const d0easy = this.w[4] - Math.exp(this.w[5] * 3) + 1; // D0(Easy)
    next = this.w[7] * d0easy + (1 - this.w[7]) * next; // mean reversion
    return clampD(next);
  };
  FSRS.prototype.stabilityRecall = function (D, S, R, g) {
    const hard = g === 2 ? this.w[15] : 1;
    const easy = g === 4 ? this.w[16] : 1;
    const inc =
      Math.exp(this.w[8]) *
      (11 - D) *
      Math.pow(S, -this.w[9]) *
      (Math.exp(this.w[10] * (1 - R)) - 1) *
      hard *
      easy;
    return clampS(S * (1 + inc));
  };
  FSRS.prototype.stabilityForget = function (D, S, R) {
    const sf =
      this.w[11] *
      Math.pow(D, -this.w[12]) *
      (Math.pow(S + 1, this.w[13]) - 1) *
      Math.exp(this.w[14] * (1 - R));
    return clampS(Math.min(sf, S)); // a lapse never increases stability
  };

  /* Apply a rating to a card. card = {state,stability,difficulty,due,lastReview,reps,lapses}
   * Returns a NEW card object. now = ms timestamp. */
  FSRS.prototype.review = function (card, g, now) {
    now = now || Date.now();
    const out = Object.assign({}, card);
    if (!card || card.state === "new" || card.stability == null) {
      out.stability = this.initStability(g);
      out.difficulty = this.initDifficulty(g);
      out.reps = 1;
      out.lapses = 0;
    } else {
      const elapsedDays = Math.max(0, (now - (card.lastReview || now)) / DAY);
      const R = this.retrievability(elapsedDays, card.stability);
      if (g === 1) {
        out.stability = this.stabilityForget(card.difficulty, card.stability, R);
        out.lapses = (card.lapses || 0) + 1;
      } else {
        out.stability = this.stabilityRecall(card.difficulty, card.stability, R, g);
      }
      out.difficulty = this.nextDifficulty(card.difficulty, g);
      out.reps = (card.reps || 0) + 1;
    }
    out.state = g === 1 ? "relearning" : "review";
    out.lastReview = now;
    const ivl = g === 1 ? 1 : this.interval(out.stability);
    out.scheduledDays = ivl;
    out.due = now + ivl * DAY;
    return out;
  };

  // A mastery proxy in [0,1] from stability (days). ~30d stable ≈ mastered.
  FSRS.prototype.mastery = function (card) {
    if (!card || card.stability == null) return 0;
    const m = 1 - Math.exp(-card.stability / 21);
    return Math.max(0, Math.min(1, m));
  };

  global.FSRS = FSRS;
  global.FSRS_DEFAULT_W = DEFAULT_W;
})(typeof window !== "undefined" ? window : globalThis);
