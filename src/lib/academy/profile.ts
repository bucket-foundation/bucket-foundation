import {
  rollupBranch,
  type BranchSummary,
  type StoredEngineState,
} from "./mastery";
import { loadCorpusForBranch, branchLabel } from "./corpus";

export interface ProgressRow {
  branch: string;
  data: StoredEngineState;
  updated_at: string;
}

export interface PublicProfile {
  handle: string;
  displayName: string | null;
  branches: BranchSummary[];
  totals: {
    branchesTouched: number;
    conceptsStarted: number;
    conceptsMastered: number;
    deepestDepthLabel: string;
    lastActivity: string | null;
  };
  framing: {
    headline: string;
    disclaimer: string;
  };
  generatedAt: string;
}

const DEPTH_RANK: Record<string, number> = {
  "Not started": 0,
  Recall: 1,
  Apply: 2,
  Derive: 3,
  "Teach-back": 4,
};

export function assemblePublicProfile(
  handle: string,
  displayName: string | null,
  rows: ProgressRow[],
  now: number = Date.now()
): PublicProfile {
  const branches: BranchSummary[] = [];

  for (const row of rows) {
    const corpus = loadCorpusForBranch(row.branch);
    if (!corpus || !corpus.atoms || corpus.atoms.length === 0) continue;
    const summary = rollupBranch(row.branch, corpus, row.data, now);
    summary.title = branchLabel(row.branch) || summary.title;
    if (summary.started > 0) branches.push(summary);
  }

  branches.sort((a, b) => a.branch.localeCompare(b.branch));

  let conceptsStarted = 0;
  let conceptsMastered = 0;
  let deepestLabel = "Not started";
  let lastActivity: string | null = null;
  for (const b of branches) {
    conceptsStarted += b.started;
    conceptsMastered += b.mastered;
    if ((DEPTH_RANK[b.deepestDepthLabel] || 0) > (DEPTH_RANK[deepestLabel] || 0)) {
      deepestLabel = b.deepestDepthLabel;
    }
    if (b.lastActivity && (!lastActivity || b.lastActivity > lastActivity)) {
      lastActivity = b.lastActivity;
    }
  }

  const name = displayName || handle;
  return {
    handle,
    displayName: displayName || null,
    branches,
    totals: {
      branchesTouched: branches.length,
      conceptsStarted,
      conceptsMastered,
      deepestDepthLabel: deepestLabel,
      lastActivity,
    },
    framing: {
      headline:
        conceptsMastered > 0
          ? `${name} has built command of ${conceptsMastered} ` +
            `concept${conceptsMastered === 1 ? "" : "s"} across ` +
            `${branches.length} canon branch${branches.length === 1 ? "" : "es"} — by learning.`
          : `${name} is building their foundations on Bucket.`,
      disclaimer:
        "This is an evolving learning record, not a certified test score. " +
        "It shows concepts a learner has worked through and re-demonstrated over " +
        "time, with visible uncertainty and recency — not a credentialed rating.",
    },
    generatedAt: new Date(now).toISOString(),
  };
}

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/;

export function normalizeHandle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const h = input.trim().toLowerCase();
  if (!HANDLE_RE.test(h)) return null;
  const RESERVED = new Set([
    "admin",
    "api",
    "academy",
    "canon",
    "about",
    "login",
    "signin",
    "settings",
    "me",
    "new",
    "null",
    "undefined",
    "bucket",
    "foundation",
    "www",
  ]);
  if (RESERVED.has(h)) return null;
  return h;
}
