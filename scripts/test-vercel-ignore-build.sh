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
  # Runs in $RUN_IN, the fixture repo unless a case points it at a clone.
  local name="$1" expect="$2"
  shift 2
  local out status got
  out="$(
    cd "${RUN_IN:-$REPO}" || exit 99
    unset VERCEL_ENV VERCEL_GIT_COMMIT_REF VERCEL_GIT_COMMIT_MESSAGE \
          VERCEL_GIT_COMMIT_SHA VERCEL_GIT_PREVIOUS_SHA VERCEL_IGNORE_FETCH_URL \
          VERCEL_GIT_REPO_OWNER VERCEL_GIT_REPO_SLUG VERCEL_GIT_PROVIDER \
          VERCEL_IGNORE_SCRATCH_DIR VERCEL_IGNORE_BASE_LABEL
    for kv in "$@"; do export "$kv"; done
    bash "$SCRIPT"
  )"
  status=$?
  if [[ $status -eq 1 ]]; then got=build; else got=skip; fi
  local reason_ok=yes
  if [[ -n "${EXPECT_REASON:-}" && "$out" != *"$EXPECT_REASON"* ]]; then reason_ok=no; fi
  if [[ "$got" == "$expect" && "$reason_ok" == yes ]]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-42s (%s)\n' "$name" "$got"
    [[ -n "${SHOW_REASON:-}" ]] && printf '      %s\n' "$(echo "$out" | grep -E "BUILD:|SKIP:" | cut -c1-220)"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-42s expected %s, got %s%s\n' "$name" "$expect" "$got" "$([[ $reason_ok == no ]] && echo ", reason lacks: $EXPECT_REASON")"
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

git -C "$REPO" mv src/app/page.tsx papers/page-draft.tsx
git -C "$REPO" commit -q -m "chore: move a file"
SHA_MOVE="$(sha_of HEAD)"
git -C "$REPO" reset -q --hard "$SHA_SITE"

# 4,000 paths under yt/ (about 150 KB of names, past the 64 KB pipe buffer)
# beside one src/ change, which sorts first in the diff.
mkdir -p "$REPO/yt"
for i in $(seq 1 4000); do echo "$i" >"$REPO/yt/transcript-$(printf '%05d' "$i")-of-a-long-video-title.txt"; done
echo "big" >>"$REPO/src/app/page.tsx"
git -C "$REPO" add -A
git -C "$REPO" commit -q -m "feat: a site change among many files"
SHA_BIG="$(sha_of HEAD)"
git -C "$REPO" reset -q --hard "$SHA_SITE"
BIG_BYTES="$(git -C "$REPO" diff --name-only "$SHA_SITE" "$SHA_BIG" | wc -c)"
if (( BIG_BYTES <= 65536 )); then
  echo "fixture error: the big diff is only $BIG_BYTES bytes" >&2
  FAIL=$((FAIL + 1))
fi

echo "fixture: base=$SHA_BASE docs=$SHA_DOCS site=$SHA_SITE move=$SHA_MOVE"
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

run_case "first deployment with no way to fetch dev builds" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat: normal work" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "dev with no previous sha skips a docs-only merge from the clone" skip \
  "VERCEL_GIT_COMMIT_REF=dev" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

run_case "dev with no previous sha builds a site merge from the clone" build \
  "VERCEL_GIT_COMMIT_REF=dev" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): a page" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "a squash body carrying [skip ci] lines still builds a site change" build \
  "VERCEL_GIT_COMMIT_REF=dev" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): a task (#200)

* wip(site): first pass [skip ci]

* fix(site): second pass [skip ci]" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "[skip vercel] skips (diff touches src/)" skip \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): work in progress [skip vercel]" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "[vercel skip] skips (diff touches src/)" skip \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): work in progress [vercel skip]" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "a file moved out of src/ counts as a src change" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=chore: move a file" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_SITE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_MOVE"

run_case "an unknown previous sha with nothing to fetch from builds" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat: normal work" \
  "VERCEL_GIT_PREVIOUS_SHA=deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

run_case "an unknown pushed commit fails the diff and builds" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat: normal work" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=feedfacefeedfacefeedfacefeedfacefeedface"

run_case "a diff past the pipe buffer with a site change builds" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat: a site change among many files" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_SITE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_BIG"

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

run_case "[vercel build] in a squash body does not force a build" skip \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes (#201)

* docs: force a build with [vercel build] when needed" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

run_case "[vercel build] forces a build over an engine branch + docs diff" build \
  "VERCEL_GIT_COMMIT_REF=feat/hte-outbox-seam" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(hte): outbox seam [vercel build]" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

# --- a clone like Vercel's -------------------------------------------------
# Vercel's build clone holds the pushed commit alone and has no remote
# (docs/VERCEL-BUILDS.md, measured 2026-09-18). Each case below clones one
# commit of the fixture at depth 1, drops the remote, and lets the script
# fetch its base from VERCEL_IGNORE_FETCH_URL.
git -C "$REPO" config uploadpack.allowReachableSHA1InWant true
git -C "$REPO" config uploadpack.allowFilter true
git -C "$REPO" branch -q -f dev "$SHA_DOCS"
git -C "$REPO" checkout -q -b feat/docs-only "$SHA_DOCS"
commit_file "docs/more.md" "docs: more notes"
SHA_FEAT_DOCS="$(sha_of HEAD)"
git -C "$REPO" checkout -q -b feat/earlier-site "$SHA_DOCS"
commit_file "src/lib/x.ts" "feat(site): a site change"
commit_file "docs/after.md" "docs: notes after the site change"
SHA_FEAT_LATE_DOCS="$(sha_of HEAD)"
git -C "$REPO" checkout -q -

shallow_clone() {
  # shallow_clone <sha>: a depth-1 clone of one commit with no remote, in $RUN_IN.
  RUN_IN="$WORKDIR/clone-$1"
  rm -rf "$RUN_IN"
  git init -q "$RUN_IN"
  git -C "$RUN_IN" fetch -q --depth=1 "file://$REPO" "$1"
  git -C "$RUN_IN" checkout -q FETCH_HEAD
  if git -C "$RUN_IN" cat-file -e "$1^" 2>/dev/null; then
    echo "fixture error: the clone of $1 holds its parent" >&2
    FAIL=$((FAIL + 1))
  fi
}

shallow_clone "$SHA_DOCS"
run_case "shallow clone: base fetched, docs-only diff skips" skip \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

# The fetch asks for trees alone: a blob only the base holds stays unfetched.
git -C "$REPO" checkout -q -b feat/blob-check "$SHA_DOCS"
commit_file "papers/only-in-base.md" "docs: a file the next commit removes"
SHA_BLOB_BASE="$(sha_of HEAD)"
git -C "$REPO" rm -q papers/only-in-base.md
git -C "$REPO" commit -q -m "docs: remove it"
SHA_BLOB_CUR="$(sha_of HEAD)"
git -C "$REPO" checkout -q -
shallow_clone "$SHA_BLOB_CUR"
KEPT="$WORKDIR/scratch-kept"
rm -rf "$KEPT"
run_case "shallow clone: a removed docs file skips" skip \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_IGNORE_SCRATCH_DIR=$KEPT" \
  "VERCEL_GIT_COMMIT_REF=feat/blob-check" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: remove it" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BLOB_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_BLOB_CUR"
# Object listing works on every git version and never fetches: the base's
# own blob must be absent from the scratch repository.
BLOB="$(git -C "$REPO" rev-parse "$SHA_BLOB_BASE:papers/only-in-base.md")"
if git --git-dir="$KEPT" cat-file --batch-all-objects --batch-check 2>/dev/null | grep -q "^$BLOB "; then
  FAIL=$((FAIL + 1))
  echo "FAIL  the base fetch brought blobs; it should bring trees alone"
else
  PASS=$((PASS + 1))
  echo "PASS  the base fetch brought trees alone"
fi
if [[ -z "$(git -C "$RUN_IN" remote)" && -z "$(git -C "$RUN_IN" config --get-regexp '^remote\.' 2>/dev/null)" ]]; then
  PASS=$((PASS + 1))
  echo "PASS  the build's clone gained no remote"
else
  FAIL=$((FAIL + 1))
  echo "FAIL  the gate changed the build's clone"
fi

shallow_clone "$SHA_SITE"
run_case "shallow clone: base fetched, site diff builds" build \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): update homepage copy" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

shallow_clone "$SHA_FEAT_LATE_DOCS"
run_case "shallow clone: a site change before the last commit builds" build \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/earlier-site" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: notes after the site change" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_DOCS" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_FEAT_LATE_DOCS"

shallow_clone "$SHA_DOCS"
run_case "shallow clone: no repository URL builds" build \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

run_case "shallow clone: a base the repository lacks builds" build \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

shallow_clone "$SHA_FEAT_DOCS"
run_case "shallow clone: first deployment, docs beside dev, skips" skip \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/docs-only" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: more notes" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_FEAT_DOCS"

shallow_clone "$SHA_FEAT_LATE_DOCS"
run_case "shallow clone: first deployment, a site change beside dev, builds" build \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/earlier-site" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: notes after the site change" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_FEAT_LATE_DOCS"

# Vercel stops supplying a previous sha after a canceled deployment, which
# is what a skip produces, so the every-other-merge case is the one that
# leaked before 2026-09-21: the gate falls back to the commit's own parent.
shallow_clone "$SHA_DOCS"
run_case "shallow clone: dev with no previous sha skips a docs-only merge" skip \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=dev" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"

shallow_clone "$SHA_SITE"
run_case "shallow clone: dev with no previous sha builds a site merge" build \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=dev" \
  "VERCEL_GIT_COMMIT_MESSAGE=feat(site): a page" \
  "VERCEL_GIT_PREVIOUS_SHA=" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_SITE"

shallow_clone "$SHA_DOCS"
EXPECT_REASON="github.com/nobody-$$/none-$$.git" \
run_case "shallow clone: owner and slug form the GitHub URL, unreachable here, so it builds" build \
  "VERCEL_GIT_REPO_OWNER=nobody-$$" \
  "VERCEL_GIT_REPO_SLUG=none-$$" \
  "VERCEL_IGNORE_FETCH_TIMEOUT=20" \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"
RUN_IN=""

# The scratch repository is removed when the gate exits.
PRIVATE_TMP="$WORKDIR/private-tmp"
mkdir -p "$PRIVATE_TMP"
shallow_clone "$SHA_DOCS"
TMPDIR="$PRIVATE_TMP" run_case "shallow clone: a fetched base under a private TMPDIR skips" skip \
  "VERCEL_IGNORE_FETCH_URL=file://$REPO" \
  "VERCEL_GIT_COMMIT_REF=feat/some-random-topic" \
  "VERCEL_GIT_COMMIT_MESSAGE=docs: add research notes" \
  "VERCEL_GIT_PREVIOUS_SHA=$SHA_BASE" \
  "VERCEL_GIT_COMMIT_SHA=$SHA_DOCS"
if [[ -z "$(ls -A "$PRIVATE_TMP")" ]]; then
  PASS=$((PASS + 1)); echo "PASS  the scratch repository is removed"
else
  FAIL=$((FAIL + 1)); echo "FAIL  the scratch repository was left in TMPDIR: $(ls "$PRIVATE_TMP")"
fi
RUN_IN=""

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
