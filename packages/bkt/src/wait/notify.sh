#!/bin/sh
NOTIFY_SEND=@@NOTIFY_SEND@@
LAUNCH() { @@LAUNCHER@@ "$@"; }
export LC_ALL=C
umask 077
tool=${1:-}
session=${2:-}
event=${3:-}
project=$(printf '%s' "${4:-}" | tr -cd 'A-Za-z0-9._ -' | cut -c1-48)
case "$session" in
  ''|*[!A-Za-z0-9_-]*) exit 0 ;;
esac
dir=${XDG_STATE_HOME:-$HOME/.local/state}/bkt
mkdir -p "$dir/sessions" 2>/dev/null || exit 0
exec 9>>"$dir/wait.lock"
flock -w 3 9 || exit 0
log=$dir/agents.jsonl
if [ -f "$log" ] && [ "$(wc -c < "$log")" -gt 1048576 ]; then
  mv -f "$log" "$log.1"
fi
now=$(date +%s)
case "$event" in
  UserPromptSubmit|PreToolUse) kind=study ;;
  Stop|SessionEnd|agent-turn-complete) kind=done ;;
  Notification|approval-requested) kind=waiting ;;
  *) exit 0 ;;
esac
state=$dir/sessions/$tool-$session
if [ "$kind" = study ]; then
  printf 'running' > "$state"
else
  [ "$(cat "$state" 2>/dev/null)" = "$kind" ] && exit 0
  printf '%s' "$kind" > "$state"
fi
find "$dir/sessions" -type f -mmin +1440 -delete 2>/dev/null
mute=$(cat "$dir/mute.stamp" 2>/dev/null)
case "$mute" in
  ''|*[!0-9]*) ;;
  *) [ "$now" -lt "$mute" ] && exit 0 ;;
esac
focus=$(head -c 512 "$dir/focus.json" 2>/dev/null | tr -d '\n\r')
fts=$(printf '%s' "$focus" | sed -n 's/.*"ts"[[:space:]]*:[[:space:]]*\([0-9]\{1,15\}\).*/\1/p')
case "$focus" in
  *'"focused":true'*)
    if [ -n "$fts" ]; then
      ms=$(date +%s%3N)
      age=$((ms - fts))
      [ "$age" -ge 0 ] && [ "$age" -lt 5000 ] && exit 0
    fi ;;
esac
if [ "$kind" = study ]; then
  last=$(cat "$dir/study.stamp" 2>/dev/null)
  case "$last" in
    ''|*[!0-9]*) ;;
    *) [ $((now - last)) -lt 600 ] && exit 0 ;;
  esac
  printf '%s' "$now" > "$dir/study.stamp"
  title="Study while you wait"
  body="Agents are running. Open Bucket and study while you wait."
elif [ "$kind" = done ]; then
  title="Done: $project"
  body="Your $tool agent finished."
else
  title="Claude is waiting for you: $project"
  [ "$tool" = codex ] && title="Codex is waiting for you: $project"
  body="It needs your input."
fi
exec 9>&-
if [ "$kind" = study ]; then
  choice=$(timeout 900 "$NOTIFY_SEND" -a Bucket -A open="Open Bucket" -A mute="Mute 1h" -- "$title" "$body" 2>/dev/null)
else
  choice=$(timeout 900 "$NOTIFY_SEND" -a Bucket -A open="Open Bucket" -- "$title" "$body" 2>/dev/null)
fi
case "$choice" in
  open)
    if [ -n "$(xdg-mime query default x-scheme-handler/bucket 2>/dev/null)" ]; then
      xdg-open bucket://learn >/dev/null 2>&1
    else
      LAUNCH app --route /learn >/dev/null 2>&1
    fi ;;
  mute)
    exec 9>>"$dir/wait.lock"
    flock -w 3 9 && printf '%s' $(( $(date +%s) + 3600 )) > "$dir/mute.stamp" ;;
esac
exit 0
