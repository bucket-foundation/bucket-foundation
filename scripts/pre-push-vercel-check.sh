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
# build lies further back than the remote's tip. On dev and main the base is
# the remote's tip.
#
# Bypass: AGF_PREPUSH_SKIP=1 git push ...

set -uo pipefail

[[ -n "${AGF_PREPUSH_SKIP:-}" ]] && exit 0

TOP="$(git rev-parse --show-toplevel)" || exit 0
GATE="$TOP/scripts/vercel-ignore-build.sh"
[[ -f "$GATE" ]] || exit 0

ZERO="0000000000000000000000000000000000000000"
needs_check=""

while read -r local_ref local_sha remote_ref remote_sha; do
  [[ -z "${local_sha:-}" || "$local_sha" == "$ZERO" ]] && continue
  [[ "$remote_ref" == refs/heads/* ]] || continue
  branch="${remote_ref#refs/heads/}"
  message="$(git log -1 --format=%B "$local_sha")"
  if [[ "$branch" == "dev" || "$branch" == "main" ]]; then
    base="$remote_sha"
    [[ "$base" == "$ZERO" ]] && base=""
  else
    base="$(git merge-base "$local_sha" origin/dev 2>/dev/null || true)"
  fi
  verdict="$(
    cd "$TOP" &&
      VERCEL_GIT_COMMIT_REF="$branch" \
      VERCEL_GIT_COMMIT_MESSAGE="$message" \
      VERCEL_GIT_COMMIT_SHA="$local_sha" \
      VERCEL_GIT_PREVIOUS_SHA="$base" \
      VERCEL_IGNORE_FETCH_URL="" \
      bash "$GATE" 2>&1 | grep -E "BUILD:|SKIP:" | tail -1
  )"
  if [[ "$verdict" == *"BUILD:"* ]]; then
    echo "[pre-push] $branch: Vercel would build this push"
    echo "  ${verdict#*] }"
    needs_check="yes"
  fi
done

[[ -z "$needs_check" ]] && exit 0

cd "$TOP" || exit 1
echo "[pre-push] running lint and the type check before the building push"
logs="$(mktemp -d)"
trap 'rm -rf "$logs"' EXIT
failed=""
npm run -s lint >"$logs/lint" 2>&1 || failed="lint"
npm run -s typecheck >"$logs/typecheck" 2>&1 || failed="${failed:+$failed and }typecheck"
if [[ -n "$failed" ]]; then
  echo "[pre-push] $failed failed, so the Vercel build would fail too. Push refused."
  grep -hE "Error|error TS" "$logs/lint" "$logs/typecheck" | head -20
  echo "  Fix it, or push work in progress with [skip ci] in the message."
  echo "  Bypass: AGF_PREPUSH_SKIP=1 git push ..."
  exit 1
fi
echo "[pre-push] lint and the type check pass"
exit 0
