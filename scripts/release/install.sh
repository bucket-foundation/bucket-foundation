#!/usr/bin/env bash
set -euo pipefail

RELEASE_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOxLPJ9aXCPCnxg+caf9yG5sBavpDE65sfeX66PkAQLs release@bucket.foundation"
SIGNER="release@bucket.foundation"
NAMESPACE="bucket-release"

usage() { echo "usage: install.sh ARTIFACT_URL_OR_PATH" >&2; exit 2; }
fail() { echo "install.sh: $*" >&2; exit 1; }
[ $# -eq 1 ] || usage

source=$1
base=${source%%\?*}
query=${source#"$base"}
prefix=${BUCKET_PREFIX:-$HOME/.local}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

name=$(basename "$base")
case "$name" in
  ""|.|..|*/*) fail "cannot name the artifact from $source" ;;
esac

fetch() {
  case "$1" in
    https://*) curl -fsSL --proto '=https' -o "$2" "$1" ;;
    http://*) fail "refusing plain http: $1" ;;
    *) cp -- "$1" "$2" ;;
  esac
}

fetch "$source" "$work/$name" || fail "download failed: $source"
fetch "$base.manifest$query" "$work/$name.manifest" || fail "no manifest at $base.manifest"
fetch "$base.manifest.sig$query" "$work/$name.manifest.sig" || fail "no signature at $base.manifest.sig"

printf '%s namespaces="%s" %s\n' "$SIGNER" "$NAMESPACE" "$RELEASE_PUBKEY" > "$work/allowed_signers"
ssh-keygen -q -Y verify -f "$work/allowed_signers" -I "$SIGNER" -n "$NAMESPACE" -s "$work/$name.manifest.sig" < "$work/$name.manifest" > /dev/null \
  || fail "signature check failed for $name"

field() { awk -F= -v k="$1" '$1==k{print substr($0, length(k)+2); exit}' "$work/$name.manifest"; }
m_name=$(field name)
m_version=$(field version)
m_sum=$(field sha256)
m_expires=$(field expires)

[ "$m_name" = "$name" ] || fail "manifest names $m_name, downloaded $name"
[[ "$m_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "manifest version is malformed"
[[ "$m_expires" =~ ^[0-9]+$ ]] || fail "manifest expiry is malformed"
[ "$m_expires" -gt "$(date +%s)" ] || fail "manifest expired; get a fresh release"
actual=$(sha256sum -- "$work/$name" | awk '{print $1}')
[ -n "$m_sum" ] && [ "$m_sum" = "$actual" ] || fail "checksum mismatch for $name"

state="$prefix/share/bucket/version"
if [ -f "$state" ]; then
  current=$(cat "$state")
  if [ "$current" != "$m_version" ] && [ "$(printf '%s\n%s\n' "$current" "$m_version" | sort -V | tail -n1)" = "$current" ]; then
    fail "refusing downgrade from $current to $m_version"
  fi
fi

mkdir -p "$prefix/bin" "$prefix/share/bucket"
case "$name" in
  *.tar.gz|*.tgz)
    dest="$prefix/lib/bucket"
    rm -rf "$dest.new" && mkdir -p "$dest.new"
    tar -xzf "$work/$name" -C "$dest.new" --no-same-owner
    [ -x "$dest.new/bin/bkt" ] || fail "archive has no bin/bkt"
    rm -rf "$dest" && mv "$dest.new" "$dest"
    ln -sfn "$dest/bin/bkt" "$prefix/bin/bkt"
    target="$prefix/bin/bkt"
    ;;
  *.AppImage)
    dest="$prefix/lib/bucket"
    mkdir -p "$dest" "$prefix/share/applications" "$prefix/share/icons/hicolor/256x256/apps"
    install -m 0755 "$work/$name" "$dest/Bucket.AppImage.new"
    mv -f "$dest/Bucket.AppImage.new" "$dest/Bucket.AppImage"
    ln -sfn "$dest/Bucket.AppImage" "$prefix/bin/bucket"
    ln -sfn "$dest/Bucket.AppImage" "$prefix/bin/bkt"
    if (cd "$work" && "$dest/Bucket.AppImage" --appimage-extract bucket.png > /dev/null 2>&1) && [ -f "$work/squashfs-root/bucket.png" ]; then
      install -m 0644 "$work/squashfs-root/bucket.png" "$prefix/share/icons/hicolor/256x256/apps/bucket.png"
    else
      echo "install.sh: could not read the icon from $name; the menu entry shows a default icon" >&2
    fi
    printf '[Desktop Entry]\nType=Application\nName=Bucket\nComment=Learn the canon offline\nExec=%s app\nIcon=bucket\nCategories=Education;Science;\nTerminal=false\nStartupWMClass=Bucket\n' "$prefix/bin/bucket" > "$prefix/share/applications/bucket.desktop"
    target="$prefix/bin/bucket"
    ;;
  *)
    install -m 0755 "$work/$name" "$prefix/bin/bucket"
    target="$prefix/bin/bucket"
    ;;
esac
printf '%s\n' "$m_version" > "$state"
echo "installed $target $m_version"
