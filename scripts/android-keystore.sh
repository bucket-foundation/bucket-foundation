#!/usr/bin/env bash
set -euo pipefail

out="${1:-$HOME/.bucket/android-upload.jks}"
alias="${ANDROID_KEY_ALIAS:-bucket-upload}"
repo="${GH_REPO:-bucket-foundation/bucket-foundation}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

command -v keytool >/dev/null || { echo "keytool not found; install a JDK" >&2; exit 1; }
command -v openssl >/dev/null || { echo "openssl not found" >&2; exit 1; }
target="$(realpath -m "$out")"
pwfile="$target.pass"
case "$target" in
  "$here"/*) echo "refusing to write the keystore inside the repo: $target" >&2; exit 1 ;;
esac
[ -e "$target" ] && { echo "keystore already exists: $target" >&2; exit 1; }

mkdir -p "$(dirname "$target")"
umask 077
BKT_KS_PASS="$(openssl rand -hex 16)"
export BKT_KS_PASS
keytool -genkeypair -keystore "$target" -storetype PKCS12 -alias "$alias" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass:env BKT_KS_PASS -keypass:env BKT_KS_PASS -dname "CN=Bucket Foundation, O=Bucket Foundation" >/dev/null 2>&1
printf '%s' "$BKT_KS_PASS" > "$pwfile"
sha="$(keytool -list -v -keystore "$target" -alias "$alias" -storepass:env BKT_KS_PASS | sed -n 's/^[[:space:]]*SHA256: //p')"

echo "keystore: $target"
echo "password: $pwfile"
echo "Back both up offline, then delete the password file. Losing the keystore forces a Play upload key reset."
echo
echo "base64 -w0 '$target' | gh secret set ANDROID_KEYSTORE_B64 --env bkt-release --repo $repo"
echo "gh secret set ANDROID_KEY_ALIAS --env bkt-release --repo $repo --body '$alias'"
echo "gh secret set ANDROID_KEYSTORE_PASSWORD --env bkt-release --repo $repo < '$pwfile'"
echo "gh secret set ANDROID_KEY_PASSWORD --env bkt-release --repo $repo < '$pwfile'"
echo "gh variable set ANDROID_CERT_SHA256 --env bkt-release --repo $repo --body '$sha'"
echo "gh secret set PLAY_SERVICE_ACCOUNT_JSON --env bkt-release --repo $repo < play-service-account.json"
