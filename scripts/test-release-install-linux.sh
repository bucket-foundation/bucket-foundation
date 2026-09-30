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

other=$root/other
ssh-keygen -q -t ed25519 -N "" -C test -f "$other"
old=$root/release/Bucket-0.3.0-x86_64.AppImage
cp "$app" "$old"
bash "$repo/scripts/release/sign.sh" --allow-unencrypted "$old" 0.3.0 "$key" > /dev/null
if HOME=$root/home bash "$root/install.sh" "$old" > /dev/null 2>"$root/err"; then
  echo "FAIL: downgrade installed" >&2; fails=$((fails + 1))
fi
check grep -q 'refusing downgrade from 0.4.0 to 0.3.0' "$root/err"

bad=$root/release/Bucket-0.5.0-x86_64.AppImage
cp "$app" "$bad"
bash "$repo/scripts/release/sign.sh" --allow-unencrypted "$bad" 0.5.0 "$other" > /dev/null
if HOME=$root/home bash "$root/install.sh" "$bad" > /dev/null 2>"$root/err"; then
  echo "FAIL: wrong-key signature installed" >&2; fails=$((fails + 1))
fi
check grep -q 'signature check failed' "$root/err"

stale=$root/release/Bucket-0.6.0-x86_64.AppImage
cp "$app" "$stale"
bash "$repo/scripts/release/sign.sh" --allow-unencrypted "$stale" 0.6.0 "$key" > /dev/null
sed -i 's/^expires=.*/expires=1000/' "$stale.manifest"
rm "$stale.manifest.sig"
ssh-keygen -q -Y sign -f "$key" -n bucket-release "$stale.manifest"
if HOME=$root/home bash "$root/install.sh" "$stale" > /dev/null 2>"$root/err"; then
  echo "FAIL: expired manifest installed" >&2; fails=$((fails + 1))
fi
check grep -q 'manifest expired' "$root/err"
check test "$(cat "$root/home/.local/share/bucket/version")" = "0.4.0"

odd=$root/'h$o%me'
mkdir -p "$odd"
HOME=$odd bash "$root/install.sh" "$app" > /dev/null 2>&1
check grep -qxF "Exec=\"$root/h\\\\\$o%%me/.local/bin/bucket\" app" "$odd/.local/share/applications/bucket.desktop"
check test -z "$(find "$odd/.local" -name '.install.*')"

printf 'tampered' >> "$app"
if HOME=$root/home bash "$root/install.sh" "$app" > /dev/null 2>&1; then
  echo "FAIL: tampered AppImage installed" >&2; fails=$((fails + 1))
fi

[ "$fails" -eq 0 ] || exit 1
echo "install.sh linux checks passed"
