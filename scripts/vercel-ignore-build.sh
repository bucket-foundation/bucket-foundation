#!/usr/bin/env bash
# Vercel "Ignored Build Step" gate for bucket.foundation.
#
# Vercel's Ignored Build Step contract: exit 1 to proceed with the build,
# exit 0 to skip it. https://vercel.com/docs/project-configuration/vercel-json#ignorecommand
#
# Why this exists: every push to every branch triggers a preview build.
# Most pushes are the "hte" research engine (Historical Truth Engine,
# 60+ of the repo's ~75 remote branches on 2026-09-14, see `git branch -r`),
# ephemeral run/intake/data checkpoints, or bot feed syncs. None of those
# touch the Next.js site. This script skips the ones that provably don't,
# and builds everything else, including production: an engine-only
# squash merge to main must not rebuild the site either.
#
# Decision order (first match wins):
#   0. Commit message contains "[vercel build]"      -> BUILD (forced override)
#   1. Commit message starts with "feed:"             -> SKIP  (bot feed sync)
#      or contains "[skip ci]", "[skip vercel]",
#      or "[vercel skip]"
#   2. Branch matches an engine prefix (below)         -> SKIP
#   3. Diff since the base touches an allowlisted path -> BUILD
#      (base cannot be fetched or diffed)              -> BUILD (fail open)
#   4. otherwise                                        -> SKIP
#
# The base at step 3: VERCEL_GIT_PREVIOUS_SHA, the branch's last successful
# deployment, when Vercel sets it; the tip of dev on a feature branch's first
# deployment; the pushed commit's parent on dev or main. Vercel's build clone
# holds the pushed commit alone and has no remote (measured 2026-09-18, see
# docs/VERCEL-BUILDS.md), so the script fetches the base at depth 1 from the
# public repository when the clone lacks it.
#
# Branch prefixes skipped at step 2, with the evidence behind each
# (from `git branch -r` on 2026-09-14, ~75 remote branches):
#   run/*      whole prefix  - ephemeral engine-run checkpoints
#                               (run/quantum-history-001, run/sacred-history-002)
#   intake/*   whole prefix  - data-ingestion branches
#                               (intake/ros-canon-promotion-3, intake/ros-literature-2)
#   data/*     whole prefix  - data-analysis branches
#                               (data/sacred-history-ai-analysis)
#   */hte-*    topic, any type - the HTE engine itself: feat/hte-*, fix/hte-*,
#                               test/hte-*, docs/hte-* accounted for 60+ of the
#                               ~75 remote branches; none touch src/, public/,
#                               or any other allowlisted path.
#   */feed-*   topic, any type - bot feed maintenance (fix/feed-bot-noise)
#   */canon-*  topic, any type - canon-ingestion topic (reserved; no standalone
#                               example yet, kept for the same reason "hte" and
#                               "feed" are, see docs/VERCEL-BUILDS.md)
#   */paper-*  topic, any type - paper-ingestion topic (docs/paper-doi)
# `feat/ros-*` and `feat/site-*` are deliberately NOT in this list: research-os
# branches routinely touch src/app/research-os/ and src/app/api/research-os/,
# so they run the real step-3 diff check instead of a blanket skip.
# `review/pr*` branches are also not listed: their content mirrors whatever
# PR they review and is unpredictable, so they also run the diff check.
#
# The allowlist at step 3 is the inverse: paths whose change requires a
# build, built from what next.config.mjs, package.json, and .vercelignore
# say the deployed app reads. See docs/VERCEL-BUILDS.md for the full
# evidence trail per entry.
#
# Force a build regardless of any of the above: put "[vercel build]" in
# the commit message.

set -uo pipefail

BUILD_EXIT=1
SKIP_EXIT=0

build() { echo "[vercel-ignore-build] BUILD: $1"; exit "$BUILD_EXIT"; }
skip()  { echo "[vercel-ignore-build] SKIP: $1"; exit "$SKIP_EXIT"; }

# The repository to fetch a missing base from. VERCEL_IGNORE_FETCH_URL
# overrides it, for tests and for a run outside Vercel.
REPO_URL="${VERCEL_IGNORE_FETCH_URL:-}"
if [[ -z "$REPO_URL" && -n "${VERCEL_GIT_REPO_OWNER:-}" && -n "${VERCEL_GIT_REPO_SLUG:-}" && "${VERCEL_GIT_PROVIDER:-github}" == "github" ]]; then
  REPO_URL="https://github.com/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}.git"
fi
FETCH_TIMEOUT="${VERCEL_IGNORE_FETCH_TIMEOUT:-120}"

REF="${VERCEL_GIT_COMMIT_REF:-}"
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"
ENVIRONMENT="${VERCEL_ENV:-}"
CUR_SHA="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
PREV_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

echo "[vercel-ignore-build] env=$ENVIRONMENT ref=$REF cur=$CUR_SHA prev=${PREV_SHA:-<empty>}"

# --- step 0: forced override, always wins ------------------------------
if [[ "$MSG" == *"[vercel build]"* ]]; then
  build "commit message contains [vercel build] (forced)"
fi

# --- step 1: commit-message skip signals --------------------------------
if [[ "$MSG" == feed:* ]]; then
  skip "commit message starts with 'feed:' (bot feed sync)"
fi
for token in "[skip ci]" "[skip vercel]" "[vercel skip]"; do
  if [[ "$MSG" == *"$token"* ]]; then
    skip "commit message contains $token"
  fi
done

# --- step 2: branch-prefix skip signals ----------------------------------
if [[ "$REF" =~ ^(run|intake|data|hte)/ ]]; then
  skip "branch '$REF' matches a whole-prefix engine pattern (run|intake|data|hte)/*"
fi
if [[ "$REF" =~ ^[^/]+/(hte|feed|canon|paper)- ]]; then
  skip "branch '$REF' matches an engine-topic pattern */(hte|feed|canon|paper)-*"
fi

# --- step 3: content-aware fallback --------------------------------------
# Applies uniformly, production included: skip only when the diff itself
# proves no allowlisted path changed.

have_commit() { git cat-file -e "$1^{commit}" 2>/dev/null; }

# fetch_from_repo <sha or refs/heads/name> <depth>: fetch into the clone,
# which has no remote. Prints git's output on failure.
fetch_from_repo() {
  if [[ -z "$REPO_URL" ]]; then
    echo "no repository URL (VERCEL_GIT_REPO_OWNER and VERCEL_GIT_REPO_SLUG unset)"
    return 1
  fi
  local runner=()
  command -v timeout >/dev/null 2>&1 && runner=(timeout "$FETCH_TIMEOUT")
  "${runner[@]}" git fetch --quiet --no-tags --depth="$2" "$REPO_URL" "$1" 2>&1
}

if [[ "$CUR_SHA" == "HEAD" ]]; then
  CUR_SHA="$(git rev-parse HEAD 2>/dev/null || echo HEAD)"
fi

if [[ -n "$PREV_SHA" ]]; then
  BASE="$PREV_SHA"
  BASE_DESC="last successful deployment $PREV_SHA"
  if ! have_commit "$BASE"; then
    if ! out="$(fetch_from_repo "$BASE" 1)"; then
      build "the $BASE_DESC is not in the clone and could not be fetched ($out); building to be safe"
    fi
  fi
elif [[ "$REF" != "dev" && "$REF" != "main" ]]; then
  # A feature branch's first deployment: compare with dev, where it will merge.
  if ! out="$(fetch_from_repo refs/heads/dev 1)"; then
    build "first deployment of '$REF' and the tip of dev could not be fetched ($out); building to be safe"
  fi
  BASE="$(git rev-parse FETCH_HEAD)"
  BASE_DESC="the tip of dev $BASE (first deployment of this branch)"
else
  if ! have_commit "${CUR_SHA}^"; then
    if ! out="$(fetch_from_repo "$CUR_SHA" 2)"; then
      build "no previous deployment on '$REF' and the parent of $CUR_SHA could not be fetched ($out); building to be safe"
    fi
  fi
  BASE="$(git rev-parse "${CUR_SHA}^" 2>/dev/null || echo "${CUR_SHA}^")"
  BASE_DESC="the parent $BASE (no previous deployment on this branch)"
fi

RANGE_DESC="$BASE_DESC to $CUR_SHA"
# --no-renames lists both paths of a moved file, so a file moved out of an
# allowlisted directory still counts as a change there.
DIFF_OUTPUT="$(git diff --name-only --no-renames "$BASE" "$CUR_SHA" 2>&1)"
DIFF_STATUS=$?

if [[ $DIFF_STATUS -ne 0 ]]; then
  build "could not compute the diff from $RANGE_DESC (git said: $DIFF_OUTPUT); building to be safe"
fi

# Paths whose change requires a build. See docs/VERCEL-BUILDS.md for the
# evidence behind each entry (next.config.mjs, package.json scripts,
# .vercelignore, and direct grep of what src/ imports or reads).
ALLOWLIST_RE='^(src/|public/|package\.json$|package-lock\.json$|next\.config\.mjs$|tailwind\.config\.ts$|postcss\.config\.mjs$|tsconfig\.json$|vercel\.json$|scripts/vercel-ignore-build\.sh$|scripts/sync-academy\.mjs$|learning/app/|bucket-canon/|canon-figures/figures\.json$|feed\.json$|PROTOCOL\.md$|GOVERNANCE\.md$|MANIFESTO\.md$|_intake/embeddings/|_intake/embeddings-v2/|_intake/connections/)'

if echo "$DIFF_OUTPUT" | grep -qE "$ALLOWLIST_RE"; then
  build "the diff from $RANGE_DESC touches an allowlisted site path: $(echo "$DIFF_OUTPUT" | grep -E "$ALLOWLIST_RE" | head -3 | tr '\n' ' ')"
fi

skip "the diff from $RANGE_DESC touches no allowlisted site path ($(echo "$DIFF_OUTPUT" | grep -c .) files changed)"
