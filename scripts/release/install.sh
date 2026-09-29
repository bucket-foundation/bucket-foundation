#!/usr/bin/env bash
set -euo pipefail

RELEASE_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOxLPJ9aXCPCnxg+caf9yG5sBavpDE65sfeX66PkAQLs release@bucket.foundation"
SIGNER="release@bucket.foundation"
NAMESPACE="bucket-release"

usage() { echo "usage: install.sh ARTIFACT_URL_OR_PATH" >&2; exit 2; }
fail() { echo "install.sh: $*" >&2; exit 1; }
[ $# -eq 1 ] || usage

source=$1
prefix=${BUCKET_PREFIX:-$HOME/.local}
pubkey=${BUCKET_RELEASE_PUBKEY:-$RELEASE_PUBKEY}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

name=$(basename "${source%%\?*}")
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
fetch "$source.sha256" "$work/$name.sha256" || fail "no checksum at $source.sha256"
fetch "$source.sig" "$work/$name.sig" || fail "no signature at $source.sig"

expected=$(awk 'NR==1{print $1}' "$work/$name.sha256")
actual=$(sha256sum -- "$work/$name" | awk '{print $1}')
[ -n "$expected" ] && [ "$expected" = "$actual" ] || fail "checksum mismatch for $name"

printf '%s namespaces="%s" %s\n' "$SIGNER" "$NAMESPACE" "$pubkey" > "$work/allowed_signers"
ssh-keygen -q -Y verify -f "$work/allowed_signers" -I "$SIGNER" -n "$NAMESPACE" -s "$work/$name.sig" < "$work/$name" > /dev/null \
  || fail "signature check failed for $name"

mkdir -p "$prefix/bin"
case "$name" in
  *.tar.gz|*.tgz)
    dest="$prefix/lib/bucket"
    rm -rf "$dest.new" && mkdir -p "$dest.new"
    tar -xzf "$work/$name" -C "$dest.new" --no-same-owner
    [ -x "$dest.new/bin/bkt" ] || fail "archive has no bin/bkt"
    rm -rf "$dest" && mv "$dest.new" "$dest"
    ln -sfn "$dest/bin/bkt" "$prefix/bin/bkt"
    echo "installed $prefix/bin/bkt"
    ;;
  *)
    install -m 0755 "$work/$name" "$prefix/bin/bucket"
    echo "installed $prefix/bin/bucket"
    ;;
esac
