#!/usr/bin/env bash
# Pre-push check for bucket.foundation: a push that Vercel would build must
# pass lint and the type check first, since `next build` fails on either and
# a failed preview costs a deployment (docs/VERCEL-BUILDS.md, "Changes on
# 2026-09-18"). A push Vercel would skip passes straight through.
#
# Git runs it as a pre-push hook: arguments <remote name> <remote url>, and
# one line per ref on stdin: <local ref> <local sha> <remote ref> <remote sha>.
# scripts/install-git-hooks.sh wires it into the hooks directory.
#
# Whether a push would build is the gate's own answer
# (scripts/vercel-ignore-build.sh), asked with the branch, the message of
# the commit being pushed, and a base. On a feature branch the base is its
# merge base with origin/dev, so every site change the branch carries counts:
# Vercel compares with the last successful deployment, which after a failed
# build lies further back than the remote's tip. On dev and main there is no
# base, so the gate answers build unless the message or branch skips.
#
# Lint and the type check read the working tree, so they vouch for the
# pushed commit only when HEAD is that commit and no file they read differs
# from it. Otherwise the push is refused with the reason.
#
# A push that Vercel would skip still gets the check when it carries code
# lint or the type checker reads. [skip ci] holds back a build; it says
# nothing about whether the code compiles, and a branch whose last push
# carried [skip ci] reaches a pull request unchecked otherwise.
#
# Bypass: AGF_PREPUSH_SKIP=1 git push ...

set -uo pipefail

[[ -n "${AGF_PREPUSH_SKIP:-}" ]] && exit 0

TOP="$(git rev-parse --show-toplevel)" || exit 0
GATE="$TOP/scripts/vercel-ignore-build.sh"
[[ -f "$GATE" ]] || exit 0

ZERO="0000000000000000000000000000000000000000"
needs_check=""
pushed_shas=""

while read -r local_ref local_sha remote_ref remote_sha; do
  [[ -z "${local_sha:-}" || "$local_sha" == "$ZERO" ]] && continue
  [[ "$remote_ref" == refs/heads/* ]] || continue
  branch="${remote_ref#refs/heads/}"
  message="$(git log -1 --format=%B "$local_sha")"
  if [[ "$branch" == "dev" || "$branch" == "main" ]]; then
    base=""
  else
    base="$(git merge-base "$local_sha" origin/dev 2>/dev/null || true)"
  fi
  # The gate's exit status is its answer, as Vercel reads it: 0 skips, and
  # anything else builds, a crash included.
  gate_out="$(
    cd "$TOP" &&
      VERCEL_GIT_COMMIT_REF="$branch" \
      VERCEL_GIT_COMMIT_MESSAGE="$message" \
      VERCEL_GIT_COMMIT_SHA="$local_sha" \
      VERCEL_GIT_PREVIOUS_SHA="$base" \
      VERCEL_IGNORE_BASE_LABEL="merge base with origin/dev" \
      VERCEL_IGNORE_FETCH_URL="" \
      bash "$GATE" 2>&1
  )"
  gate_status=$?
  if [[ $gate_status -ne 0 ]]; then
    verdict="$(grep -E "BUILD:" <<<"$gate_out" | tail -1)"
    echo "[pre-push] $branch: Vercel would build this push"
    if [[ -n "$verdict" ]]; then
      echo "  ${verdict#*] }"
    else
      echo "  the gate exited $gate_status with no verdict:"
      tail -n 5 <<<"$gate_out" | sed 's/^/    /'
    fi
    needs_check="yes"
    pushed_shas="$pushed_shas $local_sha"
  else
    # The gate skips the build. Run the check anyway when the push carries
    # code the linter and the type checker read.
    code="$(git diff --name-only "${base:-$local_sha^}" "$local_sha" -- \
      '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' 'package.json' 2>/dev/null | head -1)"
    if [[ -n "$code" ]]; then
      echo "[pre-push] $branch: Vercel would skip this push, and it carries code ($code)"
      needs_check="yes"
      pushed_shas="$pushed_shas $local_sha"
    fi
  fi
done

[[ -z "$needs_check" ]] && exit 0

cd "$TOP" || exit 1

refuse() {
  echo "[pre-push] $1 Push refused."
  echo "  Push work in progress with [skip ci] in the message, or bypass with AGF_PREPUSH_SKIP=1 git push ..."
  exit 1
}

head_sha="$(git rev-parse HEAD)"
for sha in $pushed_shas; do
  if [[ "$sha" != "$head_sha" ]]; then
    refuse "The building push is $sha, and the checkout is at $head_sha, so lint here would check the wrong commit. Check it out and push again."
  fi
done
dirty="$(git status --porcelain --untracked-files=all -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.json' '.eslintrc*' 2>/dev/null | head -5)"
if [[ -n "$dirty" ]]; then
  refuse "Files that lint and the type check read differ from the pushed commit:
$dirty
  Commit or remove them so the check runs on what Vercel builds."
fi
if [[ ! -e node_modules/.bin/next || ! -e node_modules/.bin/tsc ]]; then
  refuse "node_modules is missing here (no next or tsc), so the check cannot run. Run npm ci, or link node_modules from the main checkout."
fi

echo "[pre-push] running lint and the type check before the building push"
logs="$(mktemp -d)"
trap 'rm -rf "$logs"' EXIT
failed=""
npm run -s lint >"$logs/lint" 2>&1 || failed="lint"
npm run -s typecheck >"$logs/typecheck" 2>&1 || failed="${failed:+$failed and }typecheck"
if [[ -n "$failed" ]]; then
  echo "[pre-push] $failed failed, so the Vercel build would fail too. Push refused."
  errors="$(grep -hE "Error|error TS" "$logs/lint" "$logs/typecheck" | head -20)"
  if [[ -n "$errors" ]]; then
    echo "$errors"
  else
    tail -n 15 "$logs/lint" "$logs/typecheck"
  fi
  echo "  Fix it, or push work in progress with [skip ci] in the message."
  echo "  Bypass: AGF_PREPUSH_SKIP=1 git push ..."
  exit 1
fi
echo "[pre-push] lint and the type check pass"
exit 0
