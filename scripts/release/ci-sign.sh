#!/usr/bin/env bash
set -euo pipefail

fail() { echo "ci-sign.sh: $*" >&2; exit 1; }
[ $# -eq 2 ] || { echo "usage: ci-sign.sh DIST_DIR KEY_DIR" >&2; exit 2; }

repo=$(cd "$(dirname "$0")/../.." && pwd)
dist=$1 keys=$2
version=$(bash "$repo/scripts/release/version.sh")
mkdir -p "$keys" && chmod 700 "$keys"
key=$keys/release_ed25519
trap 'rm -f "$key" "$keys/askpass"' EXIT

if [ "${RELEASE:-false}" = true ]; then
  [ -n "${SIGNING_KEY:-}" ] || fail "tag build without the BKT_RELEASE_SIGNING_KEY secret; add it in the repo settings"
  [ -n "${SIGNING_PASSPHRASE:-}" ] || fail "tag build without the BKT_RELEASE_SIGNING_PASSPHRASE secret"
  (umask 077 && printf '%s\n' "$SIGNING_KEY" > "$key")
  printf '#!/bin/sh\nprintf "%%s\\n" "$SIGNING_PASSPHRASE"\n' > "$keys/askpass" && chmod 700 "$keys/askpass"
  pub=$(SSH_ASKPASS="$keys/askpass" SSH_ASKPASS_REQUIRE=force setsid -w ssh-keygen -y -f "$key" < /dev/null | awk '{print $1" "$2}')
  [ "$pub" = "$(awk '{print $1" "$2}' "$repo/release/bucket-release.pub")" ] || fail "the signing secret does not match release/bucket-release.pub"
  SSH_ASKPASS="$keys/askpass" SSH_ASKPASS_REQUIRE=force setsid -w bash "$repo/scripts/release/sign-all.sh" "$dist" "$version" "$key" < /dev/null
else
  ssh-keygen -q -t ed25519 -N "" -C throwaway -f "$key"
  bash "$repo/scripts/release/sign-all.sh" "$dist" "$version" "$key" --allow-unencrypted
  cut -d' ' -f1,2 "$key.pub" | sed 's/$/ release@bucket.foundation/' > "$dist/throwaway.pub"
  rm -f "$key.pub"
fi
ls -l "$dist"
