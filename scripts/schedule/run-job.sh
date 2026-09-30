#!/usr/bin/env bash
set -uo pipefail
job="$1"
repo="${BUCKET_REPO:-$HOME/agfarms/bucket-foundation}"
day="$(date +%F)"
out="$repo/reports/schedule/$job/$day.md"
mkdir -p "$(dirname "$out")"
cd "$repo" || exit 1
git fetch -q origin

prompt_file="$(dirname "$0")/prompts/$job.md"
[ -f "$prompt_file" ] || { echo "no prompt for $job" >&2; exit 1; }

claude -p --model sonnet --permission-mode bypassPermissions \
  "$(cat "$prompt_file")

Write the report to $out. Date: $day." >"$out.log" 2>&1

[ -s "$out" ] || { echo "$job produced no report" >&2; exit 1; }

verdict="$(claude -p --model sonnet --permission-mode bypassPermissions \
  "Act as the Bucket critic in docs/agents/BUCKET-CRITIC.md. Review $out as a public page. Score it. Print one final line: PASS <score> or FAIL <score>." 2>&1 | tail -1)"
echo "$verdict" >>"$out.log"

case "$verdict" in
  PASS*) ;;
  *) echo "$job report failed critic: $verdict" >&2; exit 0 ;;
esac

wt="$HOME/agfarms/.wt-schedule-$job-$day"
br="intake/schedule-$job-$day"
git worktree add -q "$wt" -b "$br" origin/dev || exit 1
mkdir -p "$wt/reports/schedule/$job"
cp "$out" "$wt/reports/schedule/$job/"
git -C "$wt" add reports/schedule
git -C "$wt" commit -qm "docs(reports): $job report $day" -m "Critic: $verdict"
git -C "$wt" push -q -u origin "$br"
gh pr create -R bucket-foundation/bucket-foundation --base dev --head "$br" \
  --title "docs(reports): $job report $day" \
  --body "Scheduled $job report. Critic verdict: $verdict. Merging publishes it to What's New."
git worktree remove --force "$wt"
