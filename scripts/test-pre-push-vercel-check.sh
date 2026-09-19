#!/usr/bin/env bash
# Exercises scripts/pre-push-vercel-check.sh against a throwaway fixture repo
# whose lint and typecheck scripts record that they ran and pass or fail on
# demand. No dependencies beyond bash, git, and npm.
# Run: bash scripts/test-pre-push-vercel-check.sh

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(mktemp -d)"
REPO="$WORKDIR/repo"
trap 'rm -rf "$WORKDIR"' EXIT

PASS=0
FAIL=0
ZERO="0000000000000000000000000000000000000000"

git init -q "$REPO"
git -C "$REPO" config user.email "test@bucket.foundation"
git -C "$REPO" config user.name "pre-push test"
git -C "$REPO" config commit.gpgsign false
mkdir -p "$REPO/scripts"
cp "$HERE/vercel-ignore-build.sh" "$HERE/pre-push-vercel-check.sh" "$REPO/scripts/"
cat >"$REPO/package.json" <<'JSON'
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "lint": "touch ran-lint && test ! -f lint-fails",
    "typecheck": "touch ran-typecheck && test ! -f typecheck-fails"
  }
}
JSON
printf 'ran-*\n*-fails\n' >"$REPO/.gitignore"
git -C "$REPO" add -A
git -C "$REPO" commit -q -m "base"
BASE="$(git -C "$REPO" rev-parse HEAD)"
git -C "$REPO" update-ref refs/remotes/origin/dev "$BASE"

commit_on() {
  # commit_on <branch> <path> <message>: prints the new sha.
  git -C "$REPO" checkout -q -B "$1" "$BASE"
  mkdir -p "$REPO/$(dirname "$2")"
  echo "change" >>"$REPO/$2"
  git -C "$REPO" add "$2"
  git -C "$REPO" commit -q -m "$3"
  git -C "$REPO" rev-parse HEAD
}

SITE="$(commit_on feat/site src/app/page.tsx "feat(site): a page")"
SITE_WIP="$(commit_on feat/wip src/app/page.tsx "feat(site): work in progress [skip ci]")"
DOCS="$(commit_on feat/docs docs/notes.md "docs: notes")"
ENGINE="$(commit_on feat/hte-run src/app/page.tsx "feat(hte): engine")"
git -C "$REPO" checkout -q -B feat/two "$SITE"
echo "notes" >"$REPO/NOTES.md"
git -C "$REPO" add NOTES.md
git -C "$REPO" commit -q -m "docs: notes after a site change"
SITE_THEN_DOCS="$(git -C "$REPO" rev-parse HEAD)"

run_case() {
  # run_case <name> <expect exit> <expect lint ran: yes|no> <stdin line> [VAR=val]...
  local name="$1" expect="$2" ran="$3" line="$4"
  shift 4
  rm -f "$REPO"/ran-* "$REPO"/*-fails
  local status got_ran out
  out="$(
    cd "$REPO" || exit 99
    for kv in "$@"; do
      case "$kv" in
        FAIL_LINT=1) touch lint-fails ;;
        FAIL_TYPES=1) touch typecheck-fails ;;
        *) export "$kv" ;;
      esac
    done
    echo "$line" | bash scripts/pre-push-vercel-check.sh origin "file://$REPO" 2>&1
  )"
  status=$?
  [[ -f "$REPO/ran-lint" ]] && got_ran=yes || got_ran=no
  if [[ "$status" == "$expect" && "$got_ran" == "$ran" ]]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-58s (exit %s, lint ran: %s)\n' "$name" "$status" "$got_ran"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-58s expected exit %s lint %s, got exit %s lint %s\n' "$name" "$expect" "$ran" "$status" "$got_ran"
    printf '%s\n' "$out" | sed 's/^/      /'
  fi
}

ref() { echo "refs/heads/$1 $2 refs/heads/$1 $3"; }

run_case "a site change runs lint and types, and passes" 0 yes "$(ref feat/site "$SITE" "$ZERO")"
run_case "a lint error refuses the push" 1 yes "$(ref feat/site "$SITE" "$ZERO")" FAIL_LINT=1
run_case "a type error refuses the push" 1 yes "$(ref feat/site "$SITE" "$ZERO")" FAIL_TYPES=1
run_case "[skip ci] pushes without a check" 0 no "$(ref feat/wip "$SITE_WIP" "$ZERO")" FAIL_LINT=1
run_case "a docs-only branch pushes without a check" 0 no "$(ref feat/docs "$DOCS" "$ZERO")" FAIL_LINT=1
run_case "an engine branch pushes without a check" 0 no "$(ref feat/hte-run "$ENGINE" "$ZERO")" FAIL_LINT=1
run_case "docs on top of a branch's site change still checks" 1 yes "$(ref feat/two "$SITE_THEN_DOCS" "$SITE")" FAIL_LINT=1
run_case "deleting a branch pushes without a check" 0 no "(delete) $ZERO refs/heads/feat/site $SITE" FAIL_LINT=1
run_case "AGF_PREPUSH_SKIP=1 bypasses the check" 0 no "$(ref feat/site "$SITE" "$ZERO")" FAIL_LINT=1 AGF_PREPUSH_SKIP=1

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
