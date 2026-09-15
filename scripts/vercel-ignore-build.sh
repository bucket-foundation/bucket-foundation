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
#      or contains "[skip ci]"
#   2. Branch matches an engine prefix (below)         -> SKIP
#   3. Diff of this push touches an allowlisted path   -> BUILD
#      (git diff cannot be computed)                   -> BUILD (fail open)
#   4. otherwise                                        -> SKIP
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
if [[ "$MSG" == *"[skip ci]"* ]]; then
  skip "commit message contains [skip ci]"
fi

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
if [[ -z "$PREV_SHA" ]]; then
  RANGE_DESC="${CUR_SHA}^ ${CUR_SHA} (no previous sha, falling back to last commit)"
  RANGE_ARGS=("${CUR_SHA}^" "$CUR_SHA")
else
  RANGE_DESC="$PREV_SHA $CUR_SHA"
  RANGE_ARGS=("$PREV_SHA" "$CUR_SHA")
fi

DIFF_OUTPUT="$(git diff --name-only "${RANGE_ARGS[@]}" 2>&1)"
DIFF_STATUS=$?

if [[ $DIFF_STATUS -ne 0 ]]; then
  build "could not compute diff for '$RANGE_DESC' (git said: $DIFF_OUTPUT) — building defensively"
fi

# Paths whose change requires a build. See docs/VERCEL-BUILDS.md for the
# evidence behind each entry (next.config.mjs, package.json scripts,
# .vercelignore, and direct grep of what src/ imports or reads).
ALLOWLIST_RE='^(src/|public/|package\.json$|package-lock\.json$|next\.config\.mjs$|tailwind\.config\.ts$|postcss\.config\.mjs$|tsconfig\.json$|vercel\.json$|scripts/vercel-ignore-build\.sh$|scripts/sync-academy\.mjs$|learning/app/|bucket-canon/|canon-figures/figures\.json$|feed\.json$|PROTOCOL\.md$|GOVERNANCE\.md$|MANIFESTO\.md$|_intake/embeddings/|_intake/embeddings-v2/|_intake/connections/)'

if echo "$DIFF_OUTPUT" | grep -qE "$ALLOWLIST_RE"; then
  build "diff ($RANGE_DESC) touches an allowlisted site path"
fi

skip "diff ($RANGE_DESC) touches no allowlisted site path"
