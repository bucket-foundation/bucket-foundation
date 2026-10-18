#!/usr/bin/env bash
set -euo pipefail

out="${1:-$HOME/.bucket/android-upload.jks}"
alias="${ANDROID_KEY_ALIAS:-bucket-upload}"
repo="${GH_REPO:-gianyrox/bucket-foundation}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

command -v keytool >/dev/null || { echo "keytool not found; install a JDK" >&2; exit 1; }
command -v openssl >/dev/null || { echo "openssl not found" >&2; exit 1; }
target="$(realpath -m "$out")"
case "$target" in
  "$here"/*) echo "refusing to write the keystore inside the repo: $target" >&2; exit 1 ;;
esac
[ -e "$target" ] && { echo "keystore already exists: $target" >&2; exit 1; }

mkdir -p "$(dirname "$target")"
umask 077
pass="$(openssl rand -hex 16)"
keytool -genkeypair -keystore "$target" -storetype PKCS12 -alias "$alias" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$pass" -keypass "$pass" -dname "CN=Bucket Foundation, O=Bucket Foundation" >/dev/null 2>&1

echo "keystore: $target"
echo "Back it up offline. Losing it forces a Play upload key reset."
echo
echo "base64 -w0 '$target' | gh secret set ANDROID_KEYSTORE_B64 --env bkt-release --repo $repo"
echo "gh secret set ANDROID_KEY_ALIAS --env bkt-release --repo $repo --body '$alias'"
echo "gh secret set ANDROID_KEYSTORE_PASSWORD --env bkt-release --repo $repo --body '$pass'"
echo "gh secret set ANDROID_KEY_PASSWORD --env bkt-release --repo $repo --body '$pass'"
echo "gh secret set PLAY_SERVICE_ACCOUNT_JSON --env bkt-release --repo $repo < play-service-account.json"
