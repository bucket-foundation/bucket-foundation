export type DepthLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type LadderMode = "consume" | "frontier" | "produce";

export interface LadderSurface {
  label: string;
  href: string;
  note: string;
}

export interface DepthRung {
  level: DepthLevel;
  label: string;
  gloss: string;
  worldAccess: string;
  mode: LadderMode;
  surfaces: LadderSurface[];
}

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
        href: "/research-os/learn",
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
        href: "/research-os/learn",
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
        href: "/excerpts",
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

export const RUNG_BY_LEVEL: Record<DepthLevel, DepthRung> = DEPTH_LADDER.reduce(
  (acc, r) => {
    acc[r.level] = r;
    return acc;
  },
  {} as Record<DepthLevel, DepthRung>,
);

export const LADDER_THESIS =
  "For 5,000 years every knowledge technology widened the access to CONSUME knowledge and none widened the access to PRODUCE it. A channel that is both scalable and production-reaching has been empty for all of recorded history — that empty cell is the consume-versus-produce gap. This ladder is Bucket's on-ramp across it: mastery → canon → tools → agent, with no gap between the rungs.";

export function rungForMastery(mastery: number): DepthLevel {
  if (!Number.isFinite(mastery) || mastery <= 0) return "L0";
  if (mastery < 0.4) return "L1";
  return "L2";
}

export function nextRung(level: DepthLevel): DepthRung | null {
  const order: DepthLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5"];
  const i = order.indexOf(level);
  if (i < 0 || i >= order.length - 1) return null;
  return RUNG_BY_LEVEL[order[i + 1]];
}

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
