/**
 * src/lib/academy/mastery.ts  (bkt-coh)
 * ------------------------------------------------------------------
 * Server-side "honest mastery" rollup for the public Mastery Profile.
 *
 * This is a faithful TS port of the EXACT mastery math the in-app engine uses
 * (learning/app/js/fsrs.js + engine.js), so a profile shows the same numbers a
 * learner sees in the Academy. We deliberately re-implement rather than import
 * the static app's vanilla JS — that file ships to the browser and has no module
 * boundary; keeping a small typed copy here is safer and self-documenting.
 *
 * HARD GUARDRAIL (EPIC.md §5, MASTERY-PROFILE.md Phase 0/1):
 *   This module produces an HONEST, uncertainty-visible signal ONLY. It does
 *   NOT compute or expose a certified/precise numeric "rating" or any claim of
 *   credentialed mastery — that is gated on a later bead (validation vs. real
 *   exams, bkt-4at). Everything here is framed as "built by learning over time":
 *   concepts started, concepts mastered, depth reached, and recency, each with
 *   visible confidence/uncertainty. No overclaiming.
 *
 * The numbers we DO surface:
 *   - started / mastered counts (mastered = the same 0.70 stability threshold
 *     the app uses for its "★ mastered" stat).
 *   - per-shell + overall mastery as a coarse percentage (a learning-progress
 *     readout, NOT a score), with a `confidence` band derived from evidence
 *     volume (reps) + recency — high coverage with thin/old evidence reads as
 *     "still proving it", never as a hidden high score.
 *   - depth reached on the Recall -> Apply -> Derive -> Teach ladder, inferred
 *     from each concept's current mastery and the quiz levels that exist for it
 *     (mirrors engine `pickLevel`), so depth points at understanding, not
 *     card-flipping.
 *   - recency: live FSRS retrievability right now (the forgetting-curve readout)
 *     and days-since-last-review.
 */

/* ----------------------------- FSRS constants ----------------------------- */
// Mirror fsrs.js exactly.
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // 0.2345679...
const DAY = 86400000;

/** Retrievability after `tDays` at stability `S` (fsrs.js retrievability). */
export function retrievability(tDays: number, S: number): number {
  if (!S || S <= 0) return 0;
  return Math.pow(1 + FACTOR * (tDays / S), DECAY);
}

/** Mastery proxy in [0,1] from stability in days (fsrs.js `mastery`). */
export function masteryFromStability(stability: number | null | undefined): number {
  if (stability == null) return 0;
  const m = 1 - Math.exp(-stability / 21);
  return Math.max(0, Math.min(1, m));
}

// engine.js summary(): a concept counts as "mastered" at mastery >= 0.70.
export const MASTERED_THRESHOLD = 0.7;

/* ------------------------------- shapes ----------------------------------- */

/** One FSRS card as engine.js persists it (only the fields we read). */
export interface StoredCard {
  state?: string;
  stability?: number | null;
  difficulty?: number | null;
  due?: number | null;
  lastReview?: number | null;
  reps?: number;
  lapses?: number;
}

/** The per-branch engine state blob stored in bucket.academy_progress.data. */
export interface StoredEngineState {
  cards?: Record<string, StoredCard>;
  settings?: Record<string, unknown>;
  stats?: {
    xp?: number;
    streak?: number;
    lastStudyDay?: string | null;
    history?: Record<string, { new?: number; reviews?: number }>;
  };
}

/** Minimal atom shape we need from a corpus to roll up mastery. */
export interface CorpusAtom {
  id: string;
  title?: string;
  gloss?: string;
  shell?: "prereq" | "nucleus" | "frontier" | string;
  leverage?: number;
  quiz?: { level?: string }[];
}

export interface CorpusMeta {
  branch?: string;
  title?: string;
  kind?: string;
}

export interface Corpus {
  meta?: CorpusMeta;
  atoms?: CorpusAtom[];
}

export type Depth = "none" | "recall" | "apply" | "derive" | "teach";
const DEPTH_ORDER: Depth[] = ["recall", "apply", "derive", "teach"];
const DEPTH_LABEL: Record<Depth, string> = {
  none: "Not started",
  recall: "Recall",
  apply: "Apply",
  derive: "Derive",
  teach: "Teach-back",
};

/** Per-concept honest signal for the inspect layer. */
export interface ConceptSignal {
  id: string;
  title: string;
  shell: string;
  leverage: number;
  started: boolean;
  mastery: number; // 0..1 learning-progress proxy (NOT a certified score)
  mastered: boolean; // mastery >= 0.70
  depth: Depth; // highest depth reached (inferred)
  depthLabel: string;
  retrievability: number | null; // live FSRS retrievability now (recency readout)
  daysSinceReview: number | null;
  reps: number;
}

export interface ShellSummary {
  shell: string;
  label: string;
  total: number;
  started: number;
  mastered: number;
  meanMastery: number; // coarse progress %, not a score
}

/** A qualitative confidence band — how *proven* this branch's signal is. */
export type Confidence = "emerging" | "developing" | "established";

export interface BranchSummary {
  branch: string; // e.g. "01-mathematics"
  title: string;
  kind?: string;
  total: number;
  started: number;
  mastered: number;
  meanMastery: number; // overall coarse progress (0..1)
  deepestDepth: Depth; // highest depth reached anywhere in the branch
  deepestDepthLabel: string;
  confidence: Confidence; // evidence-volume + recency band (uncertainty, visible)
  confidenceNote: string; // plain-language framing of the band
  lastActivity: string | null; // ISO of most recent review across the branch
  shells: ShellSummary[];
  concepts: ConceptSignal[]; // sorted by leverage desc (the map order)
  xp: number;
  streak: number;
}

const SHELL_LABEL: Record<string, string> = {
  prereq: "Prerequisite",
  nucleus: "Nucleus",
  frontier: "Frontier",
};

/**
 * Infer the highest depth a learner has demonstrated on a concept. We have no
 * stored "level reached" field (engine.js stores only FSRS state), so we infer
 * it the same way the app *targets* questions in `pickLevel`: by mastery, capped
 * to the depth levels that actually exist for the atom. This is intentionally
 * conservative — it reports the deepest level the learner is at the difficulty
 * for AND that the concept can test, never an unproven claim.
 */
function inferDepth(mastery: number, atom: CorpusAtom): Depth {
  const have = new Set((atom.quiz || []).map((q) => q.level).filter(Boolean) as string[]);
  // target ladder identical to engine.pickLevel thresholds
  const target: Depth =
    mastery < 0.25 ? "recall" : mastery < 0.5 ? "apply" : mastery < 0.75 ? "derive" : "teach";
  // walk down from target to the deepest level the atom can actually test
  for (let k = DEPTH_ORDER.indexOf(target); k >= 0; k--) {
    const lvl = DEPTH_ORDER[k];
    // if the atom has no quiz metadata at all, fall back to the mastery target
    if (have.size === 0 || have.has(lvl)) return lvl;
  }
  return "recall";
}

function maxDepth(a: Depth, b: Depth): Depth {
  if (a === "none") return b;
  if (b === "none") return a;
  return DEPTH_ORDER.indexOf(a) >= DEPTH_ORDER.indexOf(b) ? a : b;
}

/**
 * Roll a stored engine state + its corpus into an honest BranchSummary.
 * `now` is injectable for deterministic tests.
 */
export function rollupBranch(
  branchKey: string,
  corpus: Corpus,
  state: StoredEngineState | null | undefined,
  now: number = Date.now()
): BranchSummary {
  const atoms = (corpus.atoms || []).slice();
  const cards = (state && state.cards) || {};
  const isLang = corpus.meta?.kind === "language";

  const concepts: ConceptSignal[] = [];
  const shellAgg: Record<string, { total: number; started: number; mastered: number; sum: number }> = {};
  let startedTotal = 0;
  let masteredTotal = 0;
  let masterySum = 0;
  let deepest: Depth = "none";
  let lastReviewMs = 0;
  let totalReps = 0;
  let recentReps = 0; // reps within the last 90 days (recency-weighted evidence)

  for (const atom of atoms) {
    const card = cards[atom.id];
    const started = !!card;
    const mastery = masteryFromStability(card?.stability);
    const mastered = mastery >= MASTERED_THRESHOLD;
    const shell = atom.shell || "nucleus";

    let retr: number | null = null;
    let daysSince: number | null = null;
    if (card && card.lastReview != null) {
      const dDays = Math.max(0, (now - card.lastReview) / DAY);
      daysSince = +dDays.toFixed(1);
      retr = card.stability ? +retrievability(dDays, card.stability).toFixed(3) : null;
      if (card.lastReview > lastReviewMs) lastReviewMs = card.lastReview;
      const reps = card.reps || 0;
      totalReps += reps;
      if (dDays <= 90) recentReps += reps;
    }

    const depth: Depth = started ? inferDepth(mastery, atom) : "none";
    if (mastered) deepest = maxDepth(deepest, depth);

    const s = (shellAgg[shell] = shellAgg[shell] || { total: 0, started: 0, mastered: 0, sum: 0 });
    s.total++;
    s.sum += mastery;
    if (started) {
      s.started++;
      startedTotal++;
    }
    if (mastered) {
      s.mastered++;
      masteredTotal++;
    }
    masterySum += mastery;

    concepts.push({
      id: atom.id,
      title: atom.title || atom.gloss || atom.id,
      shell,
      leverage: typeof atom.leverage === "number" ? atom.leverage : 0,
      started,
      mastery: +mastery.toFixed(3),
      mastered,
      depth,
      depthLabel: DEPTH_LABEL[depth],
      retrievability: retr,
      daysSinceReview: daysSince,
      reps: card?.reps || 0,
    });
  }

  concepts.sort((a, b) => b.leverage - a.leverage);

  const total = atoms.length;
  const meanMastery = total ? masterySum / total : 0;

  // Confidence band: how *proven* is this branch's signal? Driven by evidence
  // VOLUME (recent reps) and BREADTH (mastered count) — never hidden, always
  // shown to the viewer. This is the uncertainty term, deliberately coarse and
  // qualitative (NOT a Glicko RD number — that's a later, validated bead).
  const confidence = confidenceBand(masteredTotal, recentReps, totalReps);

  const shells: ShellSummary[] = Object.keys(shellAgg)
    .sort((a, b) => (rankShell(a) - rankShell(b)))
    .map((shell) => {
      const s = shellAgg[shell];
      return {
        shell,
        label: SHELL_LABEL[shell] || shell,
        total: s.total,
        started: s.started,
        mastered: s.mastered,
        meanMastery: s.total ? +(s.sum / s.total).toFixed(3) : 0,
      };
    });

  return {
    branch: branchKey,
    title: corpus.meta?.title || branchKey,
    kind: corpus.meta?.kind,
    total,
    started: startedTotal,
    mastered: masteredTotal,
    meanMastery: +meanMastery.toFixed(3),
    deepestDepth: deepest,
    deepestDepthLabel: DEPTH_LABEL[deepest],
    confidence: confidence.band,
    confidenceNote: confidence.note,
    lastActivity: lastReviewMs ? new Date(lastReviewMs).toISOString() : null,
    shells,
    concepts: isLang ? concepts : concepts, // same handling; kept explicit for clarity
    xp: state?.stats?.xp || 0,
    streak: state?.stats?.streak || 0,
  };
}

function rankShell(shell: string): number {
  return shell === "prereq" ? 0 : shell === "nucleus" ? 1 : shell === "frontier" ? 2 : 3;
}

function confidenceBand(
  mastered: number,
  recentReps: number,
  totalReps: number
): { band: Confidence; note: string } {
  // Thin or stale evidence => "emerging" (explicitly under-proven). Lots of
  // recent retrievals across many concepts => "established". Everything between
  // is "developing". The viewer always sees this band next to any progress %.
  if (mastered >= 12 && recentReps >= 40) {
    return {
      band: "established",
      note: "Many concepts re-demonstrated recently — a well-evidenced, current record.",
    };
  }
  if (mastered >= 4 && totalReps >= 12) {
    return {
      band: "developing",
      note: "A growing record — still accumulating spaced re-demonstrations over time.",
    };
  }
  return {
    band: "emerging",
    note: "Early signal — built from limited practice so far; treat as provisional, not proven.",
  };
}
