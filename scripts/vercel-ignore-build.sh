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
#   0. Commit subject contains "[vercel build]"      -> BUILD (forced override)
#   1. Commit subject starts with "feed:"             -> SKIP  (bot feed sync)
#      or contains "[skip ci]", "[skip vercel]",
#      or "[vercel skip]" (subject line alone)
#   2. Branch matches an engine prefix (below)         -> SKIP
#   3. Diff since the base touches an allowlisted path -> BUILD
#      (base cannot be fetched or diffed)              -> BUILD (fail open)
#   4. otherwise                                        -> SKIP
#
# The base at step 3: VERCEL_GIT_PREVIOUS_SHA, the branch's last successful
# deployment, when Vercel sets it; the tip of dev on a feature branch with no
# successful deployment yet. On dev or main with no previous deployment sha,
# which Vercel stops sending once the branch's last deployment was canceled,
# the base is the pushed commit's first parent, and only when that commit is
# a merge or a squash merge; anything else on those branches builds. The
# squash test reads the subject for a trailing "(#123)", so an ordinary
# commit written that way is taken at its word. Vercel's build clone holds
# the pushed commit alone and has no remote (measured 2026-09-18, see
# docs/VERCEL-BUILDS.md), so the script
# fetches the trees of the base and the pushed commit at depth 1 from the
# public repository into a scratch repository when the clone lacks the base.
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
# the commit subject line.

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
FETCH_TIMEOUT="${VERCEL_IGNORE_FETCH_TIMEOUT:-90}"

REF="${VERCEL_GIT_COMMIT_REF:-}"
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"
ENVIRONMENT="${VERCEL_ENV:-}"
CUR_SHA="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
PREV_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

echo "[vercel-ignore-build] env=$ENVIRONMENT ref=$REF cur=$CUR_SHA prev=${PREV_SHA:-<empty>}"

# Every token counts on the subject line alone (step 1 says why).
SUBJECT="${MSG%%$'\n'*}"

# --- step 0: forced override, always wins ------------------------------
if [[ "$SUBJECT" == *"[vercel build]"* ]]; then
  build "commit subject contains [vercel build] (forced)"
fi

# --- step 1: commit-message skip signals --------------------------------
# Skip tokens count on the subject line alone. A squash merge can carry
# every commit message of a pull request in its body, including the
# work-in-progress commits marked [skip ci]; those lines must not skip the
# merge itself.
if [[ "$SUBJECT" == feed:* ]]; then
  skip "commit message starts with 'feed:' (bot feed sync)"
fi
for token in "[skip ci]" "[skip vercel]" "[vercel skip]"; do
  if [[ "$SUBJECT" == *"$token"* ]]; then
    skip "commit subject contains $token"
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

# True when the pushed commit brought a whole branch with it: a merge
# commit, or a squash merge, which carries "(#123)" at the end of its
# subject. Both hold one commit's worth of branch history on the target
# branch, so their first parent is the base.
merge_shaped() {
  [[ "$SUBJECT" =~ \(#[0-9]+\)[[:space:]]*$ ]] && return 0
  local parents
  parents="$(git rev-list --parents -n 1 "$CUR_SHA" 2>/dev/null | wc -w)"
  [[ "$parents" -ge 3 ]]
}

# The diff runs in the clone when it holds the base. Vercel's clone does
# not, so both commits' trees are fetched at depth 1 into a scratch bare
# repository and the diff runs there. The scratch repository leaves the
# build's clone untouched, and it has no objects of its own for git 2.48
# and later to copy into a promisor pack, which in the clone measured 814 MB
# (critic round 2, 2026-09-19). --filter=blob:none: the diff needs trees
# alone, 8.2 MB for two commits of this repository against a pack of about
# 815 MB with blobs.
# VERCEL_IGNORE_SCRATCH_DIR keeps the scratch repository, for tests.
SCRATCH=""
cleanup() {
  if [[ -n "$SCRATCH" && -z "${VERCEL_IGNORE_SCRATCH_DIR:-}" ]]; then
    rm -rf "$SCRATCH"
  fi
}
trap cleanup EXIT

# fetch_pair <base refspec source>: fetch the base (a sha or refs/heads/name)
# and the pushed commit into the scratch repository as refs/gate/base and
# refs/gate/cur. It runs in a command substitution to capture its reason on
# failure, so the scratch repository is made beforehand in this shell,
# where SCRATCH must be set for the diff and the cleanup to see it.
# Fetches the pushed commit with one ancestor, so its first parent can serve
# as the base. Vercel stops supplying VERCEL_GIT_PREVIOUS_SHA once the last
# deployment on the branch was canceled, which a skip does, so on dev and
# main a skip would otherwise force the next merge to build (measured on
# deployments dpl_HkRXdM... and dpl_GRCQFC..., 2026-09-20).
fetch_parent() {
  if [[ -z "$REPO_URL" ]]; then
    echo "no repository URL (VERCEL_GIT_REPO_OWNER and VERCEL_GIT_REPO_SLUG unset)"
    return 1
  fi
  if [[ -z "$SCRATCH" ]]; then
    echo "no scratch repository"
    return 1
  fi
  local runner=() out status parent
  command -v timeout >/dev/null 2>&1 && runner=(timeout "$FETCH_TIMEOUT")
  out="$(GIT_TERMINAL_PROMPT=0 "${runner[@]}" git --git-dir="$SCRATCH" fetch --quiet --no-tags \
    --filter=blob:none --depth=2 origin "+$CUR_SHA:refs/gate/cur" 2>&1)"
  status=$?
  if [[ $status -eq 124 ]]; then
    echo "fetch from $REPO_URL timed out after ${FETCH_TIMEOUT}s"
    return 1
  fi
  if [[ $status -ne 0 ]]; then
    echo "git fetch from $REPO_URL exited $status: ${out:-no output}"
    return 1
  fi
  parent="$(git --git-dir="$SCRATCH" rev-parse --verify --quiet "refs/gate/cur^1^{commit}" 2>/dev/null)"
  if [[ -z "$parent" ]]; then
    echo "$CUR_SHA has no first parent in the fetch"
    return 1
  fi
  git --git-dir="$SCRATCH" update-ref refs/gate/base "$parent"
}

fetch_pair() {
  if [[ -z "$REPO_URL" ]]; then
    echo "no repository URL (VERCEL_GIT_REPO_OWNER and VERCEL_GIT_REPO_SLUG unset)"
    return 1
  fi
  if [[ -z "$SCRATCH" ]]; then
    echo "no scratch repository"
    return 1
  fi
  local runner=() out status
  command -v timeout >/dev/null 2>&1 && runner=(timeout "$FETCH_TIMEOUT")
  out="$(GIT_TERMINAL_PROMPT=0 "${runner[@]}" git --git-dir="$SCRATCH" fetch --quiet --no-tags \
    --filter=blob:none --depth=1 origin "+$1:refs/gate/base" "+$CUR_SHA:refs/gate/cur" 2>&1)"
  status=$?
  if [[ $status -eq 124 ]]; then
    echo "fetch from $REPO_URL timed out after ${FETCH_TIMEOUT}s"
    return 1
  fi
  if [[ $status -ne 0 ]]; then
    echo "git fetch from $REPO_URL exited $status: ${out:-no output}"
    return 1
  fi
}

make_scratch() {
  [[ -n "$REPO_URL" ]] || return 0
  SCRATCH="${VERCEL_IGNORE_SCRATCH_DIR:-$(mktemp -d)}"
  if git init -q --bare "$SCRATCH" &&
    git --git-dir="$SCRATCH" remote add origin "$REPO_URL" &&
    git --git-dir="$SCRATCH" config remote.origin.promisor true &&
    git --git-dir="$SCRATCH" config remote.origin.partialclonefilter blob:none; then
    return 0
  fi
  cleanup
  SCRATCH=""
}

if [[ "$CUR_SHA" == "HEAD" ]]; then
  CUR_SHA="$(git rev-parse HEAD 2>/dev/null || echo HEAD)"
fi

BASE_LABEL="${VERCEL_IGNORE_BASE_LABEL:-last successful deployment}"
DIFF_GIT=(git)
DIFF_BASE=""
DIFF_CUR="$CUR_SHA"
if [[ -n "$PREV_SHA" ]]; then
  BASE_DESC="$BASE_LABEL $PREV_SHA"
  if have_commit "$PREV_SHA"; then
    DIFF_BASE="$PREV_SHA"
  elif make_scratch && out="$(fetch_pair "$PREV_SHA")"; then
    DIFF_GIT=(git --git-dir="$SCRATCH")
    DIFF_BASE="refs/gate/base"
    DIFF_CUR="refs/gate/cur"
  else
    build "the $BASE_DESC is not in the clone and could not be fetched ($out); building to be safe"
  fi
elif [[ "$REF" != "dev" && "$REF" != "main" ]]; then
  # No successful deployment on this branch yet: compare with dev, where it
  # will merge. A branch cut from an older dev compares against changes it
  # lacks too, which can only add a build.
  make_scratch
  if ! out="$(fetch_pair refs/heads/dev)"; then
    build "no successful deployment of '$REF' yet and the tip of dev could not be fetched ($out); building to be safe"
  fi
  DIFF_GIT=(git --git-dir="$SCRATCH")
  DIFF_BASE="refs/gate/base"
  DIFF_CUR="refs/gate/cur"
  BASE_DESC="the tip of dev $("${DIFF_GIT[@]}" rev-parse refs/gate/base 2>/dev/null) (no successful deployment of this branch yet)"
elif ! merge_shaped; then
  # dev and main with no previous sha, on a commit that is neither a merge
  # nor a squash merge. One parent covers one commit, and a push of several
  # ordinary commits carries changes that parent cannot see, so a site
  # change in an earlier commit would skip and never deploy.
  build "no previous deployment sha on '$REF' and $CUR_SHA is not a merge, so one parent cannot cover the push; building to be safe"
elif have_commit "$CUR_SHA^"; then
  # A merge or a squash merge brings one commit's worth of branch history,
  # so its first parent is what the branch held before it. Vercel drops the
  # previous sha after a canceled deployment, which a skip produces.
  DIFF_BASE="$CUR_SHA^"
  DIFF_CUR="$CUR_SHA"
  BASE_DESC="the first parent of $CUR_SHA (no previous deployment sha on '$REF')"
elif make_scratch && out="$(fetch_parent)"; then
  DIFF_GIT=(git --git-dir="$SCRATCH")
  DIFF_BASE="refs/gate/base"
  DIFF_CUR="refs/gate/cur"
  BASE_DESC="the first parent of $CUR_SHA (no previous deployment sha on '$REF')"
else
  build "no previous deployment sha on '$REF' and the parent of $CUR_SHA could not be fetched ($out); building to be safe"
fi

RANGE_DESC="$BASE_DESC to $CUR_SHA"
# --no-renames lists both paths of a moved file, so a file moved out of an
# allowlisted directory still counts as a change there.
DIFF_OUTPUT="$("${DIFF_GIT[@]}" diff --name-only --no-renames "$DIFF_BASE" "$DIFF_CUR" 2>&1)"
DIFF_STATUS=$?

if [[ $DIFF_STATUS -ne 0 ]]; then
  build "could not compute the diff from $RANGE_DESC (git said: $DIFF_OUTPUT); building to be safe"
fi

# Paths whose change requires a build. See docs/VERCEL-BUILDS.md for the
# evidence behind each entry (next.config.mjs, package.json scripts,
# .vercelignore, and direct grep of what src/ imports or reads).
ALLOWLIST_RE='^(src/|public/|package\.json$|package-lock\.json$|next\.config\.mjs$|tailwind\.config\.ts$|postcss\.config\.mjs$|tsconfig\.json$|vercel\.json$|scripts/vercel-ignore-build\.sh$|scripts/sync-academy\.mjs$|learning/app/|bucket-canon/|canon-figures/figures\.json$|feed\.json$|PROTOCOL\.md$|GOVERNANCE\.md$|MANIFESTO\.md$|_intake/embeddings/|_intake/embeddings-v2/|_intake/connections/)'

# grep reads a here-string. Under pipefail, `echo | grep -q` on a diff past
# the pipe buffer (about 64 KB of paths) lets grep exit at the first match,
# echo dies of SIGPIPE, the pipeline fails, and a site change would skip.
if grep -qE "$ALLOWLIST_RE" <<<"$DIFF_OUTPUT"; then
  MATCHED="$(grep -E "$ALLOWLIST_RE" <<<"$DIFF_OUTPUT")"
  build "the diff from $RANGE_DESC touches an allowlisted site path: $(head -3 <<<"$MATCHED" | tr '\n' ' ')"
fi

skip "the diff from $RANGE_DESC touches no allowlisted site path ($(grep -c . <<<"$DIFF_OUTPUT") files changed)"
