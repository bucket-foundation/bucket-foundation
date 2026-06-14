/**
 * src/lib/academy/profile.ts  (bkt-coh)
 * ------------------------------------------------------------------
 * Assemble a PUBLIC Mastery Profile from a learner's stored progress.
 *
 * Pure data layer (no Supabase, no Next) so it is trivially unit-testable and
 * reusable by the API route AND the server-rendered /m/<handle> page.
 *
 * Privacy: the assembled object carries ONLY a handle + optional display name +
 * the honest mastery rollup. No email, no user_id, no raw FSRS card internals
 * beyond what the inspect layer needs. The HARD GUARDRAIL lives in mastery.ts —
 * this layer never adds a certified rating.
 */
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
  // honest, branch-spanning rollup (the "shape of a mind")
  branches: BranchSummary[];
  totals: {
    branchesTouched: number;
    conceptsStarted: number;
    conceptsMastered: number;
    deepestDepthLabel: string;
    lastActivity: string | null;
  };
  // framing strings the UI renders verbatim so copy stays honest + consistent.
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

/**
 * Build a PublicProfile from the raw progress rows of one user. Branches with no
 * matching static corpus (user-generated decks) are skipped — the public
 * profile only shows canon branches. Branches the learner never started are
 * omitted (we don't pad the map with empty branches).
 */
export function assemblePublicProfile(
  handle: string,
  displayName: string | null,
  rows: ProgressRow[],
  now: number = Date.now()
): PublicProfile {
  const branches: BranchSummary[] = [];

  for (const row of rows) {
    const corpus = loadCorpusForBranch(row.branch);
    if (!corpus || !corpus.atoms || corpus.atoms.length === 0) continue; // unknown/custom deck
    const summary = rollupBranch(row.branch, corpus, row.data, now);
    // prefer the picker label (e.g. "Mathematics") over the long meta.title
    summary.title = branchLabel(row.branch) || summary.title;
    if (summary.started > 0) branches.push(summary);
  }

  // canon order: sort by deck order proxy (slug) then by started desc
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
      // The honest-signal disclaimer, shown on every public profile. This is the
      // EPIC.md §5 guardrail made visible to viewers.
      disclaimer:
        "This is an evolving learning record, not a certified test score. " +
        "It shows concepts a learner has worked through and re-demonstrated over " +
        "time, with visible uncertainty and recency — not a credentialed rating.",
    },
    generatedAt: new Date(now).toISOString(),
  };
}

/** Handle normalization + validation shared by the API and the claim flow. */
export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/;

export function normalizeHandle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const h = input.trim().toLowerCase();
  if (!HANDLE_RE.test(h)) return null;
  // a small reserved-word guard so profiles can't shadow real routes
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
