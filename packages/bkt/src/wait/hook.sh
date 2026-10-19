#!/bin/sh
NOTIFY=@@NOTIFY@@
export LC_ALL=C
exec 2>/dev/null
umask 077
tool=claude
payload=
if [ "${1:-}" = codex ]; then
  tool=codex
  for a in "$@"; do payload=$a; done
  payload=$(printf '%s' "$payload" | head -c 65536 | tr -d '\n\r\000')
else
  payload=$(head -c 65536 2>/dev/null | tr -d '\n\r\000')
fi
pick() {
  printf '%s' "$payload" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\(\([^\"\\\\]\|\\\\.\)*\)\".*/\1/p" | head -c 4096
}
if [ "$tool" = codex ]; then
  session=$(pick thread-id)
  [ -n "$session" ] || session=$(pick turn-id)
  event=$(pick type)
else
  session=$(pick session_id)
  event=$(pick hook_event_name)
fi
cwd=$(pick cwd)
session=$(printf '%s' "$session" | tr -cd 'A-Za-z0-9_-' | cut -c1-64)
case "$event" in
  UserPromptSubmit|PreToolUse|SubagentStop|Stop|SessionEnd|Notification|agent-turn-complete|approval-requested) ;;
  *) exit 0 ;;
esac
[ -n "$session" ] || exit 0
base=${cwd%/}
base=${base##*/}
project=$(printf '%s' "$base" | tr -cd 'A-Za-z0-9._ -' | cut -c1-48 | sed 's/^ *//;s/ *$//')
case "$project" in
  *[A-Za-z0-9]*) ;;
  *) project="project-$(printf '%s' "$cwd" | sha1sum 2>/dev/null | cut -c1-6)" ;;
esac
dir=${XDG_STATE_HOME:-$HOME/.local/state}/bkt
mkdir -p "$dir" 2>/dev/null || exit 0
ts=$(date +%s)
line="{\"v\":1,\"ts\":$ts,\"tool\":\"$tool\",\"session\":\"$session\",\"event\":\"$event\",\"project\":\"$project\"}"
case "$line" in
  *'\'*) exit 0 ;;
esac
[ ${#line} -le 512 ] || exit 0
printf '%s\n' "$line" >> "$dir/agents.jsonl" 2>/dev/null
[ -x "$NOTIFY" ] && setsid "$NOTIFY" "$tool" "$session" "$event" "$project" >/dev/null 2>&1 </dev/null &
exit 0
