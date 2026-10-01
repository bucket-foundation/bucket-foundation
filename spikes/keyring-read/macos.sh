#!/usr/bin/env bash
set -uo pipefail

here=$(cd "$(dirname "$0")" && pwd)
work=$1 release=$2 branch=$3 reader=$4
keychain=bkt-spike.keychain
identifier=foundation.bucket.spike.keyring-read

rm -rf "$work"
mkdir -p "$work/restore/expected"
sw_vers
uname -m
security create-keychain -p spike "$keychain"
security list-keychains -d user -s "$keychain"
security default-keychain -s "$keychain"
security unlock-keychain -p spike "$keychain"
security set-keychain-settings "$keychain"

bun "$here/ts/write-keys.mjs" write "$work" "$release" "$branch" || exit 1

"$reader" timed 30 "$work/acl" /usr/bin/security dump-keychain -a "$keychain"
echo '```'
cat "$work/acl.out" "$work/acl.err"
echo '```'

cp "$reader" "$work/reader-linker"
cp "$reader" "$work/reader-adhoc"
codesign --force -s - --identifier "$identifier" "$work/reader-adhoc"
cp "$reader" "$work/reader-unsigned"
codesign --remove-signature "$work/reader-unsigned"

for variant in linker adhoc unsigned; do
  echo
  echo "#### signature of reader-$variant"
  echo '```'
  codesign -dvvv "$work/reader-$variant" 2>&1 | grep -E "Identifier|Signature|flags|CDHash|not signed|TeamIdentifier"
  echo '```'
  "$work/reader-$variant" run "$work" "$variant" || echo "reader-$variant did not run: exit $?"
  bun "$here/ts/write-keys.mjs" verify "$work"
done

printf 'restore-check-value' > "$work/restore/expected/restore-test"
echo "restored restore-test" > "$work/restore/accounts.txt"
export SPIKE_SERVICE=bucket-bkt-rust
echo
echo "#### an item stored by the ad hoc signed Rust binary"
"$work/reader-adhoc" timed 30 "$work/restore/store" "$work/reader-adhoc" store restore-test "$work/restore/expected/restore-test"
cat "$work/restore/store.err"
"$work/reader-adhoc" run "$work/restore" stored-by-adhoc-read-by-same
SPIKE_BUILD_TAG=v2 cargo build --release --locked --manifest-path "$here/Cargo.toml" 2>&1 | tail -1
cp "$here/target/release/keyring-read" "$work/reader-adhoc-v2"
codesign --force -s - --identifier "$identifier" "$work/reader-adhoc-v2"
echo '```'
codesign -dvvv "$work/reader-adhoc-v2" 2>&1 | grep -E "Identifier|Signature|CDHash"
echo '```'
"$work/reader-adhoc-v2" run "$work/restore" stored-by-adhoc-read-by-rebuilt
"$work/reader-linker" run "$work/restore" stored-by-adhoc-read-by-linker
"$reader" timed 30 "$work/restore/acl" /usr/bin/security dump-keychain -a "$keychain"
echo '```'
grep -B2 -A40 'bucket-bkt-rust' "$work/restore/acl.out" | head -80
echo '```'
