#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/bkt-quiz-notify.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin"
cat > "$tmp/bin/systemd-run" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$STUB_DIR/systemd-run.args"
STUB
cat > "$tmp/bin/notify-send" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$STUB_DIR/notify-send.args"
echo open
STUB
cat > "$tmp/bin/bkt" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$STUB_DIR/bkt.args"
STUB
chmod +x "$tmp/bin/"*
export STUB_DIR="$tmp" PATH="$tmp/bin:$PATH"

"$HERE/bkt-daily-quiz-notify" 2026-10-06
grep -q -- '--user --quiet --collect --unit bkt-daily-quiz-notify-2026-10-06' "$tmp/systemd-run.args"
grep -q -- '--setenv=BKT_QUIZ_NOTIFY_INNER=1' "$tmp/systemd-run.args"
[ ! -f "$tmp/notify-send.args" ]
echo "ok: the outer call hands off to a transient unit outside the caller's cgroup"

export BKT_DAILY_DIR="$tmp/daily"
BKT_QUIZ_NOTIFY_INNER=1 "$HERE/bkt-daily-quiz-notify" 2026-10-06
grep -q -- '-A open=Open quiz' "$tmp/notify-send.args"
grep -q -- 'The daily quiz for 2026-10-06 is ready in Bucket\.$' "$tmp/notify-send.args"
grep -qx -- 'app --route /work/daily/2026-10-06' "$tmp/bkt.args"
echo "ok: the Open quiz action opens the Bucket app daily quiz route"

mkdir -p "$tmp/daily/2026-10-06" && : > "$tmp/daily/2026-10-06/critic.md"
BKT_QUIZ_NOTIFY_INNER=1 "$HERE/bkt-daily-quiz-notify" 2026-10-06
grep -q -- 'The critic notes are in critic.md beside it on this computer\.$' "$tmp/notify-send.args"
echo "ok: the text names the quiz the app holds, and the critic notes only when the file exists"

BKT_INSTALL_DEST="$tmp/dest" "$HERE/install-bkt-daily-quiz-notify.sh" >/dev/null
cmp -s "$HERE/bkt-daily-quiz-notify" "$tmp/dest/bkt-daily-quiz-notify"
cmp -s "$HERE/bkt-daily-critic-quiz" "$tmp/dest/bkt-daily-critic-quiz"
echo changed >> "$tmp/dest/bkt-daily-critic-quiz"
BKT_INSTALL_DEST="$tmp/dest" "$HERE/install-bkt-daily-quiz-notify.sh" >/dev/null
grep -qx changed "$tmp/dest/bkt-daily-critic-quiz.bak"
grep -q 'quiz.json' "$tmp/dest/bkt-daily-critic-quiz"
bash -n "$HERE/bkt-daily-critic-quiz"
echo "ok: the installer writes both scripts into the folder it is given and keeps an old copy"
