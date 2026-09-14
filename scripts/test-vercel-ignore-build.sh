#!/usr/bin/env bash
# Exercises scripts/vercel-ignore-build.sh against a throwaway fixture repo.
# No dependencies beyond bash + git. Run: bash scripts/test-vercel-ignore-build.sh

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/vercel-ignore-build.sh"
WORKDIR="$(mktemp -d)"
REPO="$WORKDIR/repo"
trap 'rm -rf "$WORKDIR"' EXIT

PASS=0
FAIL=0

commit_file() {
  # commit_file <relpath> <message>
  local rel="$1" msg="$2"
  mkdir -p "$REPO/$(dirname "$rel")"
  echo "content for $rel" >> "$REPO/$rel"
  git -C "$REPO" add "$rel"
  git -C "$REPO" commit -q -m "$msg"
}

sha_of() { git -C "$REPO" rev-parse "$1"; }

run_case() {
  # run_case <name> <expect: build|skip> <VAR=val>...
  local name="$1" expect="$2"
  shift 2
  local out status got
  out="$(
    cd "$REPO" || exit 99
    unset VERCEL_ENV VERCEL_GIT_COMMIT_REF VERCEL_GIT_COMMIT_MESSAGE \
          VERCEL_GIT_COMMIT_SHA VERCEL_GIT_PREVIOUS_SHA
    for kv in "$@"; do export "$kv"; done
    bash "$SCRIPT"
  )"
  status=$?
  if [[ $status -eq 1 ]]; then got=build; else got=skip; fi
  if [[ "$got" == "$expect" ]]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-42s (%s)\n' "$name" "$got"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-42s expected %s, got %s\n' "$name" "$expect" "$got"
    printf '      output:\n%s\n' "$out" | sed 's/^/      /'
  fi
}

# --- fixture repo: three commits (base -> docs-only -> site) -----------
git init -q "$REPO"
git -C "$REPO" config user.email "test@bucket.foundation"
git -C "$REPO" config user.name "vercel-ignore-build test"
git -C "$REPO" config commit.gpgsign false

commit_file "README.md" "base commit"
SHA_BASE="$(sha_of HEAD)"

commit_file "papers/notes.md" "docs: add research notes"
SHA_DOCS="$(sha_of HEAD)"

commit_file "src/app/page.tsx" "feat(site): update homepage copy"
SHA_SITE="$(sha_of HEAD)"

echo "fixture: base=$SHA_BASE docs=$SHA_DOCS site=$SHA_SITE"
echo

# --- cases ----------------------------------------------------------------

run_case "engine branch skips (diff touches src/)" skip \
  "VERCEL_GIT_COMMIT_REF=feat/hte-outbox-seam" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(hte): outbox seam" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "hte/integration skips (diff touches src/)" skip \
  "VERCEL_GIT_COMMIT_REF=hte/integration" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(hte): outbox seam" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "site change on feature branch builds" build \
  "VERCEL_GIT_COMMIT_REF=feat/site-reform-education-reposition" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): reposition education" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "docs-only change skips" skip \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

run_case "feed commit skips (diff touches src/)" skip \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-branch" \
  "VERCEL_GIT_COMMIT_MESSAGE=feed: nightly sync 2026-09-14" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "empty previous sha falls back to HEAD^ HEAD" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat: normal work" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "uncomputable diff builds (bad previous sha)" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat: normal work" \
  "VERCEL_GIT_PREVIOUS_SHA=deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "production skips on engine-only diff" skip \
  "VERCEL_ENV=production" \
  "VERCEL_GIT_COMMIT_REF=main" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

run_case "production builds on site-touching diff" build \
  "VERCEL_ENV=production" \
  "VERCEL_GIT_COMMIT_REF=main" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): update homepage copy" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "[vercel build] forces a build over an engine branch + docs diff" build \
  "VERCEL_GIT_COMMIT_REF=feat/hte-outbox-seam" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(hte): outbox seam [vercel build]" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
