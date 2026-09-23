const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
const DAY = 86400000;

export function retrievability(tDays: number, S: number): number {
  if (!S || S <= 0) return 0;
  return Math.pow(1 + FACTOR * (tDays / S), DECAY);
}

export function masteryFromStability(stability: number | null | undefined): number {
  if (stability == null) return 0;
  const m = 1 - Math.exp(-stability / 21);
  return Math.max(0, Math.min(1, m));
}

export const MASTERED_THRESHOLD = 0.7;

const ADAPTIVE = {
  PROF_SLOPE: 1.0,
  PROF_DEPTH_B: { recall: -0.8, apply: -0.2, derive: 0.6, teach: 1.2 } as Record<string, number>,
  MASTERY_ALPHA: 1.0,
  MASTERY_BETA: 1.0,
  RETENTION_HORIZON_DAYS: 90,
};

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface ProficiencyState {
  theta?: number;
  n?: number;
}

export function proficiencyScore(prof: ProficiencyState | null | undefined): number {
  if (!prof || typeof prof.theta !== "number" || !prof.n) return 0;
  return clamp01(sigmoid(ADAPTIVE.PROF_SLOPE * (prof.theta - ADAPTIVE.PROF_DEPTH_B.apply)));
}

export function retentionAtHorizon(stability: number | null | undefined): number {
  if (!stability || stability <= 0) return 0;
  return clamp01(retrievability(ADAPTIVE.RETENTION_HORIZON_DAYS, stability));
}

export function fuseMastery(P: number, R: number): number {
  P = clamp01(P);
  R = clamp01(R);
  if (P <= 0 || R <= 0) return 0;
  return clamp01(Math.pow(P, ADAPTIVE.MASTERY_ALPHA) * Math.pow(R, ADAPTIVE.MASTERY_BETA));
}

export function fusedConceptMastery(
  card: StoredCard | undefined,
  prof: ProficiencyState | undefined
): { mastery: number; proficiency: number | null; retention: number | null } {
  if (!card) return { mastery: 0, proficiency: null, retention: null };
  const stability = card.stability ?? null;
  if (!prof || !prof.n) {
    return { mastery: masteryFromStability(stability), proficiency: null, retention: null };
  }
  const P = proficiencyScore(prof);
  const R = retentionAtHorizon(stability);
  return { mastery: fuseMastery(P, R), proficiency: P, retention: R };
}

export interface StoredCard {
  state?: string;
  stability?: number | null;
  difficulty?: number | null;
  due?: number | null;
  lastReview?: number | null;
  reps?: number;
  lapses?: number;
}

export interface StoredEngineState {
  cards?: Record<string, StoredCard>;
  prof?: Record<string, ProficiencyState>;
  settings?: Record<string, unknown>;
  stats?: {
    xp?: number;
    streak?: number;
    lastStudyDay?: string | null;
    history?: Record<string, { new?: number; reviews?: number }>;
  };
}

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

export interface ConceptSignal {
  id: string;
  title: string;
  shell: string;
  leverage: number;
  started: boolean;
  mastery: number;
  mastered: boolean;
  proficiency: number | null;
  retention: number | null;
  attempts: number;
  depth: Depth;
  depthLabel: string;
  retrievability: number | null;
  daysSinceReview: number | null;
  reps: number;
}

export interface ShellSummary {
  shell: string;
  label: string;
  total: number;
  started: number;
  mastered: number;
  meanMastery: number;
}

export type Confidence = "emerging" | "developing" | "established";

export interface BranchSummary {
  branch: string;
  title: string;
  kind?: string;
  total: number;
  started: number;
  mastered: number;
  meanMastery: number;
  deepestDepth: Depth;
  deepestDepthLabel: string;
  confidence: Confidence;
  confidenceNote: string;
  lastActivity: string | null;
  shells: ShellSummary[];
  concepts: ConceptSignal[];
  xp: number;
  streak: number;
}

const SHELL_LABEL: Record<string, string> = {
  prereq: "Prerequisite",
  nucleus: "Nucleus",
  frontier: "Frontier",
};

function inferDepth(mastery: number, atom: CorpusAtom): Depth {
  const have = new Set((atom.quiz || []).map((q) => q.level).filter(Boolean) as string[]);
  const target: Depth =
    mastery < 0.25 ? "recall" : mastery < 0.5 ? "apply" : mastery < 0.75 ? "derive" : "teach";
  for (let k = DEPTH_ORDER.indexOf(target); k >= 0; k--) {
    const lvl = DEPTH_ORDER[k];
    if (have.size === 0 || have.has(lvl)) return lvl;
  }
  return "recall";
}

function maxDepth(a: Depth, b: Depth): Depth {
  if (a === "none") return b;
  if (b === "none") return a;
  return DEPTH_ORDER.indexOf(a) >= DEPTH_ORDER.indexOf(b) ? a : b;
}

export function rollupBranch(
  branchKey: string,
  corpus: Corpus,
  state: StoredEngineState | null | undefined,
  now: number = Date.now()
): BranchSummary {
  const atoms = (corpus.atoms || []).slice();
  const cards = (state && state.cards) || {};
  const prof = (state && state.prof) || {};
  const isLang = corpus.meta?.kind === "language";

  const concepts: ConceptSignal[] = [];
  const shellAgg: Record<string, { total: number; started: number; mastered: number; sum: number }> = {};
  let startedTotal = 0;
  let masteredTotal = 0;
  let masterySum = 0;
  let deepest: Depth = "none";
  let lastReviewMs = 0;
  let totalReps = 0;
  let recentReps = 0;

  for (const atom of atoms) {
    const card = cards[atom.id];
    const started = !!card;
    const fused = fusedConceptMastery(card, prof[atom.id]);
    const mastery = fused.mastery;
    const mastered = mastery >= MASTERED_THRESHOLD;
    const attempts = prof[atom.id]?.n || 0;
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
      proficiency: fused.proficiency != null ? +fused.proficiency.toFixed(3) : null,
      retention: fused.retention != null ? +fused.retention.toFixed(3) : null,
      attempts,
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
    concepts: isLang ? concepts : concepts,
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
