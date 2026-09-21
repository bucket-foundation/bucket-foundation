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
printf 'ran-*\n*-fails\nnode_modules/\n' >"$REPO/.gitignore"
mkdir -p "$REPO/node_modules/.bin"
touch "$REPO/node_modules/.bin/next" "$REPO/node_modules/.bin/tsc"
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
  # The checkout moves to the pushed commit first, as when pushing the
  # current branch; AT=<sha> checks out another commit instead.
  local name="$1" expect="$2" ran="$3" line="$4"
  shift 4
  rm -f "$REPO"/ran-* "$REPO"/*-fails
  local status got_ran out at
  at="$(echo "$line" | awk '{print $2}')"
  for kv in "$@"; do [[ "$kv" == AT=* ]] && at="${kv#AT=}"; done
  [[ "$at" == "$ZERO" ]] && at="$BASE"
  git -C "$REPO" checkout -q --detach "$at"
  out="$(
    cd "$REPO" || exit 99
    for kv in "$@"; do
      case "$kv" in
        FAIL_LINT=1) touch lint-fails ;;
        FAIL_TYPES=1) touch typecheck-fails ;;
        DIRTY=1) echo "// changed" >>src/app/page.tsx ;;
        UNTRACKED=1) mkdir -p src/lib && echo "broken(" >src/lib/stray.ts ;;
        NO_MODULES=1) mv node_modules node_modules.off ;;
        AT=*) ;;
        *) export "$kv" ;;
      esac
    done
    echo "$line" | bash scripts/pre-push-vercel-check.sh origin "file://$REPO" 2>&1
  )"
  status=$?
  git -C "$REPO" checkout -q -- . 2>/dev/null
  rm -f "$REPO/src/lib/stray.ts"
  [[ -d "$REPO/node_modules.off" ]] && mv "$REPO/node_modules.off" "$REPO/node_modules"
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
# [skip ci] holds back a build, and code still gets checked.
run_case "[skip ci] on code still runs the check" 1 yes "$(ref feat/wip "$SITE_WIP" "$ZERO")" FAIL_LINT=1
run_case "[skip ci] on code passes when the code is clean" 0 yes "$(ref feat/wip "$SITE_WIP" "$ZERO")"
run_case "a docs-only branch pushes without a check" 0 no "$(ref feat/docs "$DOCS" "$ZERO")" FAIL_LINT=1
# An engine branch skips the build and still has to compile.
run_case "an engine branch with code still runs the check" 1 yes "$(ref feat/hte-run "$ENGINE" "$ZERO")" FAIL_LINT=1
run_case "docs on top of a branch's site change still checks" 1 yes "$(ref feat/two "$SITE_THEN_DOCS" "$SITE")" FAIL_LINT=1
run_case "deleting a branch pushes without a check" 0 no "(delete) $ZERO refs/heads/feat/site $SITE" FAIL_LINT=1
run_case "AGF_PREPUSH_SKIP=1 bypasses the check" 0 no "$(ref feat/site "$SITE" "$ZERO")" FAIL_LINT=1 AGF_PREPUSH_SKIP=1
run_case "a push from another checkout is refused" 1 no "$(ref feat/site "$SITE" "$ZERO")" "AT=$DOCS"
run_case "an uncommitted change to a checked file is refused" 1 no "$(ref feat/site "$SITE" "$ZERO")" DIRTY=1
run_case "an untracked .ts file is refused" 1 no "$(ref feat/site "$SITE" "$ZERO")" UNTRACKED=1
run_case "missing node_modules is refused with the reason" 1 no "$(ref feat/site "$SITE" "$ZERO")" NO_MODULES=1
# A docs-only push to dev skips the build and carries no code to check.
run_case "a docs-only push to dev needs no check" 0 no "$(ref dev "$DOCS" "$BASE")" FAIL_LINT=1
run_case "a code push to dev runs the check" 1 yes "$(ref dev "$SITE" "$BASE")" FAIL_LINT=1
run_case "[skip ci] on dev still runs the check on code" 1 yes "$(ref dev "$SITE_WIP" "$BASE")" FAIL_LINT=1
run_case "a tag push has no check" 0 no "refs/tags/v1 $SITE refs/tags/v1 $ZERO" FAIL_LINT=1
# A gate that crashes answers build on Vercel, so the check must run.
cp "$REPO/scripts/vercel-ignore-build.sh" "$WORKDIR/gate.keep"
printf '#!/usr/bin/env bash\nset -u\necho "$UNBOUND_FOR_THE_TEST"\n' >"$REPO/scripts/vercel-ignore-build.sh"
run_case "a gate that crashes counts as build and the check runs" 1 yes "$(ref feat/docs "$DOCS" "$ZERO")" FAIL_LINT=1
cp "$WORKDIR/gate.keep" "$REPO/scripts/vercel-ignore-build.sh"

# --- the installer --------------------------------------------------------
HOOKS="$WORKDIR/hooks"
git -C "$REPO" config core.hooksPath "$HOOKS"
cp "$HERE/install-git-hooks.sh" "$REPO/scripts/"
install_case() {
  # install_case <name> <expect exit>
  local status
  (cd "$REPO" && bash scripts/install-git-hooks.sh >/dev/null 2>&1)
  status=$?
  if [[ "$status" == "$2" ]]; then
    PASS=$((PASS + 1)); printf 'PASS  %-58s (exit %s)\n' "$1" "$status"
  else
    FAIL=$((FAIL + 1)); printf 'FAIL  %-58s expected exit %s, got %s\n' "$1" "$2" "$status"
  fi
}
install_case "the installer writes a pre-push" 0
install_case "running it again is harmless" 0
if grep -qF "scripts/pre-push-vercel-check.sh" "$HOOKS/pre-push" && [[ -x "$HOOKS/pre-push" ]]; then
  PASS=$((PASS + 1)); echo "PASS  the installed hook runs the repository's check"
else
  FAIL=$((FAIL + 1)); echo "FAIL  the installed hook does not run the repository's check"
fi
git -C "$REPO" checkout -q --detach "$SITE"
rm -f "$REPO"/ran-* "$REPO"/*-fails
if (cd "$REPO" && echo "$(ref feat/site "$SITE" "$ZERO")" | "$HOOKS/pre-push" origin x >"$WORKDIR/hook.out" 2>&1) && [[ -f "$REPO/ran-lint" ]]; then
  PASS=$((PASS + 1)); echo "PASS  the installed hook runs lint on a building push"
else
  FAIL=$((FAIL + 1)); echo "FAIL  the installed hook did not run lint on a building push"
  sed "s/^/      /" "$WORKDIR/hook.out"
fi
# A worktree's own hooks directory sits in the main checkout, so the shared
# test must not read it as somebody else's.
WT="$WORKDIR/worktree"
git -C "$REPO" worktree add -q --detach "$WT" HEAD 2>/dev/null
cp "$HERE/install-git-hooks.sh" "$HERE/pre-push-vercel-check.sh" "$HERE/vercel-ignore-build.sh" "$WT/scripts/" 2>/dev/null
if (cd "$WT" && git config --unset core.hooksPath 2>/dev/null; cd "$WT" && npm_lifecycle_event=prepare bash scripts/install-git-hooks.sh >"$WORKDIR/wt.out" 2>&1) &&
  [[ -x "$REPO/.git/hooks/pre-push" || -x "$(git -C "$WT" rev-parse --git-common-dir)/hooks/pre-push" ]]; then
  PASS=$((PASS + 1)); echo "PASS  npm install inside a worktree installs the hook"
else
  FAIL=$((FAIL + 1)); echo "FAIL  npm install inside a worktree did not install the hook"
  sed 's/^/      /' "$WORKDIR/wt.out" 2>/dev/null
fi
git -C "$REPO" worktree remove --force "$WT" 2>/dev/null
git -C "$REPO" config core.hooksPath "$HOOKS"

printf '#!/bin/sh\necho mine\n' >"$HOOKS/pre-push"
install_case "an existing pre-push of someone else's is left alone" 1
if grep -q "echo mine" "$HOOKS/pre-push"; then
  PASS=$((PASS + 1)); echo "PASS  the other hook is unchanged"
else
  FAIL=$((FAIL + 1)); echo "FAIL  the installer overwrote another hook"
fi

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
