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

BKT_QUIZ_NOTIFY_INNER=1 "$HERE/bkt-daily-quiz-notify" 2026-10-06
grep -q -- '-A open=Open quiz' "$tmp/notify-send.args"
grep -qx -- 'app --route /work/daily/2026-10-06' "$tmp/bkt.args"
echo "ok: the Open quiz action opens the Bucket app daily quiz route"
