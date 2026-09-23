#!/usr/bin/env bash

set -uo pipefail

BUILD_EXIT=1
SKIP_EXIT=0

build() { echo "[vercel-ignore-build] BUILD: $1"; exit "$BUILD_EXIT"; }
skip()  { echo "[vercel-ignore-build] SKIP: $1"; exit "$SKIP_EXIT"; }

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

SUBJECT="${MSG%%$'\n'*}"

if [[ "$SUBJECT" == *"[vercel build]"* ]]; then
  build "commit subject contains [vercel build] (forced)"
fi

if [[ "$SUBJECT" == feed:* ]]; then
  skip "commit message starts with 'feed:' (bot feed sync)"
fi
for token in "[skip ci]" "[skip vercel]" "[vercel skip]"; do
  if [[ "$SUBJECT" == *"$token"* ]]; then
    skip "commit subject contains $token"
  fi
done

if [[ "$REF" =~ ^(run|intake|data|hte|ops|gate|measure)/ ]]; then
  skip "branch '$REF' matches a whole-prefix engine pattern (run|intake|data|hte|ops|gate|measure)/*"
fi
if [[ "$REF" =~ ^[^/]+/(hte|feed|canon|paper)- ]]; then
  skip "branch '$REF' matches an engine-topic pattern */(hte|feed|canon|paper)-*"
fi

have_commit() { git cat-file -e "$1^{commit}" 2>/dev/null; }

merge_shaped() {
  [[ "$SUBJECT" =~ \(#[0-9]+\)[[:space:]]*$ ]] && return 0
  local parents
  parents="$(git rev-list --parents -n 1 "$CUR_SHA" 2>/dev/null | wc -w)"
  [[ "$parents" -ge 3 ]]
}

SCRATCH=""
cleanup() {
  if [[ -n "$SCRATCH" && -z "${VERCEL_IGNORE_SCRATCH_DIR:-}" ]]; then
    rm -rf "$SCRATCH"
  fi
}
trap cleanup EXIT

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
  make_scratch
  if ! out="$(fetch_pair refs/heads/dev)"; then
    build "no successful deployment of '$REF' yet and the tip of dev could not be fetched ($out); building to be safe"
  fi
  DIFF_GIT=(git --git-dir="$SCRATCH")
  DIFF_BASE="refs/gate/base"
  DIFF_CUR="refs/gate/cur"
  BASE_DESC="the tip of dev $("${DIFF_GIT[@]}" rev-parse refs/gate/base 2>/dev/null) (no successful deployment of this branch yet)"
elif ! merge_shaped; then
  build "no previous deployment sha on '$REF' and $CUR_SHA is not a merge, so one parent cannot cover the push; building to be safe"
elif have_commit "$CUR_SHA^"; then
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
DIFF_OUTPUT="$("${DIFF_GIT[@]}" diff --name-only --no-renames "$DIFF_BASE" "$DIFF_CUR" 2>&1)"
DIFF_STATUS=$?

if [[ $DIFF_STATUS -ne 0 ]]; then
  build "could not compute the diff from $RANGE_DESC (git said: $DIFF_OUTPUT); building to be safe"
fi

ALLOWLIST_RE='^(src/|public/|package\.json$|package-lock\.json$|next\.config\.mjs$|tailwind\.config\.ts$|postcss\.config\.mjs$|tsconfig\.json$|vercel\.json$|scripts/vercel-ignore-build\.sh$|scripts/sync-academy\.mjs$|learning/app/|bucket-canon/|canon-figures/figures\.json$|feed\.json$|PROTOCOL\.md$|GOVERNANCE\.md$|MANIFESTO\.md$|_intake/embeddings/|_intake/embeddings-v2/|_intake/connections/)'

if grep -qE "$ALLOWLIST_RE" <<<"$DIFF_OUTPUT"; then
  MATCHED="$(grep -E "$ALLOWLIST_RE" <<<"$DIFF_OUTPUT")"
  build "the diff from $RANGE_DESC touches an allowlisted site path: $(head -3 <<<"$MATCHED" | tr '\n' ' ')"
fi

skip "the diff from $RANGE_DESC touches no allowlisted site path ($(grep -c . <<<"$DIFF_OUTPUT") files changed)"
