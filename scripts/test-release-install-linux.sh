#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/.." && pwd)
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
fails=0
check() { if ! "$@"; then echo "FAIL: $*" >&2; fails=$((fails + 1)); fi; }

mkdir -p "$root/home" "$root/tmp" "$root/cwd" "$root/release"
key=$root/key
ssh-keygen -q -t ed25519 -N "" -C test -f "$key"
pub=$(cat "$key.pub")
sed "s|^RELEASE_PUBKEY=.*|RELEASE_PUBKEY=\"$pub\"|" "$repo/scripts/release/install.sh" > "$root/install.sh"

app=$root/release/Bucket-0.4.0-x86_64.AppImage
cat > "$app" <<'APP'
#!/bin/sh
if [ "$1" = "--appimage-extract" ]; then
  mkdir -p squashfs-root
  printf 'png' > squashfs-root/bucket.png
  exit 0
fi
echo bucket
APP
chmod 0644 "$app"
bash "$repo/scripts/release/sign.sh" --allow-unencrypted "$app" 0.4.0 "$key" > /dev/null

outside_before=$(cd "$root" && find . -path ./home -prune -o -print | sort)
out=$(cd "$root/cwd" && HOME=$root/home TMPDIR=$root/tmp PATH=$PATH bash "$root/install.sh" "$app" 2>&1)
outside_after=$(cd "$root" && find . -path ./home -prune -o -print | sort)

bin=$root/home/.local/bin/bucket
desktop=$root/home/.local/share/applications/bucket.desktop
image=$root/home/.local/lib/bucket/Bucket.AppImage

check test -x "$image"
check test -x "$bin"
check test -L "$bin"
check test -f "$root/home/.local/share/icons/hicolor/256x256/apps/bucket.png"
check grep -q '^Name=Bucket$' "$desktop"
check grep -q "^Exec=\"$bin\" app$" "$desktop"
check grep -q '^Icon=bucket$' "$desktop"
check grep -q '^Categories=Education;Science;$' "$desktop"
check test "$(cat "$root/home/.local/share/bucket/version")" = "0.4.0"
check grep -q "^installed $bin 0.4.0$" <<< "$out"
check grep -q "  $desktop$" <<< "$out"
check test "$("$bin")" = "bucket"
check test "$outside_before" = "$outside_after"
check test -z "$(ls -A "$root/cwd")"
check test -z "$(ls -A "$root/tmp")"

if HOME=$root/home BUCKET_PREFIX=$root/elsewhere bash "$root/install.sh" "$app" > /dev/null 2>"$root/err"; then
  echo "FAIL: install outside HOME succeeded" >&2; fails=$((fails + 1))
fi
check grep -q 'outside' "$root/err"
check test ! -e "$root/elsewhere"

if HOME=$root/home BUCKET_PREFIX=$root/home/../escape bash "$root/install.sh" "$app" > /dev/null 2>&1; then
  echo "FAIL: dotdot prefix succeeded" >&2; fails=$((fails + 1))
fi
check test ! -e "$root/escape"

printf 'tampered' >> "$app"
if HOME=$root/home bash "$root/install.sh" "$app" > /dev/null 2>&1; then
  echo "FAIL: tampered AppImage installed" >&2; fails=$((fails + 1))
fi

[ "$fails" -eq 0 ] || exit 1
echo "install.sh linux checks passed"
