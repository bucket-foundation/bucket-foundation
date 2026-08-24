/**
 * src/lib/depth-ladder.ts  (bkt-a7v)
 * ------------------------------------------------------------------
 * The continuous L0→L5 depth ladder, Bucket's answer to the "empty
 * scalable-AND-production-reaching cell" the flagship education-atlas research
 * names (THE-KNOWLEDGE-ACCESS-GRADIENT.md). It maps the pieces Bucket already
 * shipped onto a single climb so a learner can go from mastery → frontier →
 * producing knowledge WITHOUT a gap:
 *
 *     Academy mastery (L1, L2 consume)
 *         → Canon reading (L3, L4 frontier)
 *             → research tools + research agent (L4, L5 produce)
 *
 * The L0, L5 rung labels/descriptions are VENDORED from the single source of
 * truth, education-atlas/analysis/landscape/scale.py (DEPTH_LEVELS /
 * DEPTH_LABELS + the doc comment). We do NOT invent new levels here; we only
 * attach (a) world-access percentages from the published gradient and (b) the
 * Bucket surface that serves each rung. Numbers trace to the atlas; surfaces
 * are this repo's routes. If scale.py changes, update this file to match.
 *
 * No external deps, no Story Protocol, pure data, safe to import anywhere
 * (server or client).
 */

/** A rung on the constructed knowledge-depth ladder (scale.py DEPTH_LEVELS). */
export type DepthLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

/** Which side of the consume↔produce divide a rung sits on. */
export type LadderMode = "consume" | "frontier" | "produce";

/** The Bucket surface that serves a rung, if any. */
export interface LadderSurface {
  /** short label for the on-ramp button */
  label: string;
  /** in-app route (relative) */
  href: string;
  /** one-line "what this is" */
  note: string;
}

export interface DepthRung {
  level: DepthLevel;
  /** vendored from scale.py DEPTH_LABELS */
  label: string;
  /** vendored gloss from scale.py's doc comment / access-proxy column */
  gloss: string;
  /** world-average access at this depth (THE-KNOWLEDGE-ACCESS-GRADIENT.md) */
  worldAccess: string;
  mode: LadderMode;
  /** the Bucket pieces that operate at this rung (in climb order) */
  surfaces: LadderSurface[];
}

/**
 * The ladder. Rung definitions (level/label/gloss) are the vendored copy of
 * scale.py; worldAccess is the published world-average gradient used on
 * /mission; surfaces are this repo's shipped pieces mapped onto each rung.
 */
export const DEPTH_LADDER: DepthRung[] = [
  {
    level: "L0",
    label: "L0 basic literacy",
    gloss: "basic literacy / numeracy — read a simple text, do basic arithmetic",
    worldAccess: "82.5%",
    mode: "consume",
    surfaces: [],
  },
  {
    level: "L1",
    label: "L1 K-12 / secondary",
    gloss: "K-12 / secondary schooling — the shared foundations everyone is meant to reach",
    worldAccess: "62.4%",
    mode: "consume",
    surfaces: [
      {
        label: "Academy",
        href: "/academy",
        note: "Spaced-repetition mastery over the foundations of each branch — the consume rung, done honestly.",
      },
    ],
  },
  {
    level: "L2",
    label: "L2 undergraduate",
    gloss: "undergraduate — systematic command of a field's established core",
    worldAccess: "37.4%",
    mode: "consume",
    surfaces: [
      {
        label: "Academy mastery",
        href: "/academy",
        note: "Push a branch to high honest mastery (M = proficiency^α · retention^β) — the top of the consume side.",
      },
    ],
  },
  {
    level: "L3",
    label: "L3 graduate / prof",
    gloss: "graduate / professional — reading the field's own literature, not textbooks about it",
    worldAccess: "8.1%",
    mode: "frontier",
    surfaces: [
      {
        label: "the canon",
        href: "/canon",
        note: "Free primary knowledge — axioms, real math, laws, primary derivations. The bridge from established knowledge toward the frontier.",
      },
    ],
  },
  {
    level: "L4",
    label: "L4 frontier (read primary research)",
    gloss: "frontier — reaching primary research: being a researcher, reading the primary literature",
    worldAccess: "0.14%",
    mode: "frontier",
    surfaces: [
      {
        label: "canon + claims",
        href: "/canon/claims",
        note: "Read the primary derivations and the claim graph at the boundary of a branch.",
      },
      {
        label: "research tools",
        href: "/research/tools",
        note: "40 instruments that let a motivated person DO frontier research, not only read about it.",
      },
    ],
  },
  {
    level: "L5",
    label: "L5 producing new knowledge",
    gloss: "producing new knowledge — adding to the frontier: publishing, deriving what was not there before",
    worldAccess: "0.06%",
    mode: "produce",
    surfaces: [
      {
        label: "research agent",
        href: "/research/agent",
        note: "The terminal rung: a grounded plan→retrieve→synthesize→cite agent over the canon, literature, and the 40 tools — produce-side work, cited and reproducible.",
      },
    ],
  },
];

/** Fast lookup by level. */
export const RUNG_BY_LEVEL: Record<DepthLevel, DepthRung> = DEPTH_LADDER.reduce(
  (acc, r) => {
    acc[r.level] = r;
    return acc;
  },
  {} as Record<DepthLevel, DepthRung>,
);

/**
 * The mission framing this ladder answers: every prior knowledge technology
 * widened CONSUME access and none widened PRODUCE access; the channel that is
 * both scalable and production-reaching has been empty for all of recorded
 * history, and AI is the first candidate to fill it. The ladder is the on-ramp
 * across that empty cell. (THE-KNOWLEDGE-ACCESS-GRADIENT.md.)
 */
export const LADDER_THESIS =
  "For 5,000 years every knowledge technology widened the access to CONSUME knowledge and none widened the access to PRODUCE it. A channel that is both scalable and production-reaching has been empty for all of recorded history — that empty cell is the consume-versus-produce gap. This ladder is Bucket's on-ramp across it: mastery → canon → tools → agent, with no gap between the rungs.";

/**
 *-mastery → depth-rung mapping for a single Academy branch. The Academy
 * itself spans the consume side (L1, L2); this estimates WHERE on the ladder a
 * learner currently sits for one branch, so the UI can surface the next
 * rung up. Conservative by design, the Academy gives a signal (see
 * /m/<handle> for certified ratings), so we never place a learner ABOVE L2 from
 * mastery alone; the climb past L2 is gated on the learner opening the
 * canon / tools / agent.
 *
 * @param mastery 0..1 mastery for the branch (0 if unknown).
 */
export function rungForMastery(mastery: number): DepthLevel {
  if (!Number.isFinite(mastery) || mastery <= 0) return "L0";
  if (mastery < 0.4) return "L1";
  // L2 is the ceiling reachable from Academy mastery alone (the consume top).
  return "L2";
}

/**
 * Given a learner's current rung, the next rung UP and the on-ramp surfaces
 * that get them there. Returns null at the top (L5). This is the produce-side
 * on-ramp: "I learned it → read the canon on it → use the agent to do frontier
 * work on it."
 */
export function nextRung(level: DepthLevel): DepthRung | null {
  const order: DepthLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5"];
  const i = order.indexOf(level);
  if (i < 0 || i >= order.length - 1) return null;
  return RUNG_BY_LEVEL[order[i + 1]];
}

/**
 * Map a canon/academy branch slug to a domain-scoped on-ramp: the canon branch,
 * the research hub, and the research agent for THAT domain. Branch slugs are
 * the canon slugs (mathematics, physics, chemistry, information, biophysics,
 * cosmology, mind) which match the Academy branch ids. The agent is
 * domain-agnostic (one endpoint), so we seed it with the branch as context via
 * the query string the agent page already understands (?q= is optional).
 */
export function domainOnRamp(branchSlug: string): {
  canon: LadderSurface;
  tools: LadderSurface;
  agent: LadderSurface;
} {
  const slug = (branchSlug || "").trim().toLowerCase();
  return {
    canon: {
      label: "read the canon",
      href: slug ? `/canon/${encodeURIComponent(slug)}` : "/canon",
      note: "The primary derivations and foundations of this branch — free to read.",
    },
    tools: {
      label: "open the research tools",
      href: "/research/tools",
      note: "Instruments to do frontier work in this domain.",
    },
    agent: {
      label: "ask the research agent",
      href: "/research/agent",
      note: "Plan → retrieve → synthesize → cite. The terminal, produce-side rung.",
    },
  };
}
