#!/usr/bin/env bash
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
work=$1 release=$2 branch=$3 reader=$4
secrets=org.freedesktop.secrets
root=/org/freedesktop/secrets

printf spike | gnome-keyring-daemon --unlock --components=secrets > /dev/null
bun "$here/ts/write-keys.ts" write "$work" "$release" "$branch"
"$reader" run "$work" unlocked
bun "$here/ts/write-keys.ts" verify "$work"

collection=$(gdbus call --session --dest $secrets --object-path $root --method org.freedesktop.Secret.Service.ReadAlias default | grep -o "/org/freedesktop/secrets/collection/[^']*")
locked() { gdbus call --session --dest $secrets --object-path "$collection" --method org.freedesktop.DBus.Properties.Get org.freedesktop.Secret.Collection Locked; }
items() { gdbus call --session --dest $secrets --object-path $root --method org.freedesktop.Secret.Service.SearchItems "{'service': 'bucket-bkt'}" | grep -o "collection/[^']*" | sort | tr '\n' ' '; }
before=$(items)
gdbus call --session --dest $secrets --object-path $root --method org.freedesktop.Secret.Service.Lock "['$collection']" > /dev/null
echo "collection $collection Locked before the locked run: $(locked)"
"$reader" run "$work" locked
echo "collection Locked after the locked run: $(locked)"
after=$(items)
if [ "$before" = "$after" ]; then echo "the keyring lists the same four items after the locked run"; else echo "the item list changed: $before / $after"; fi
