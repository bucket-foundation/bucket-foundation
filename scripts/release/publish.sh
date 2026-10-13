#!/usr/bin/env bash
set -euo pipefail

fail() { echo "publish.sh: $*" >&2; exit 1; }
[ $# -eq 2 ] || { echo "usage: publish.sh TAG DIR" >&2; exit 2; }

tag=$1 dir=$2
[[ "$tag" =~ ^bkt-v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "tag must look like bkt-v1.2.3: $tag"
version=${tag#bkt-v}
repo=${GITHUB_REPOSITORY:-bucket-foundation/bucket-foundation}

expected=(bkt-linux-x64 bkt-linux-arm64 bkt-darwin-arm64 bkt-darwin-x64 bkt-windows-x64.exe "Bucket-$version-x86_64.AppImage")
for a in "${expected[@]}"; do [[ "$a" =~ ^[A-Za-z0-9._-]+$ ]] || fail "asset names may use only letters, digits, dot, underscore and hyphen: $a"; done
assets=()
for a in "${expected[@]}"; do
  for suffix in "" .sha256 .manifest .manifest.sig; do
    [ -s "$dir/$a$suffix" ] || fail "missing $a$suffix"
    assets+=("$dir/$a$suffix")
  done
done

if ! gh release view "$tag" --repo "$repo" > /dev/null 2>&1; then
  gh release create "$tag" --repo "$repo" --verify-tag --prerelease --title "Bucket $version" \
    --notes "bkt $version for Linux, macOS and Windows, plus the Linux AppImage. Install with scripts/install.sh or scripts/install.ps1 from this tag."
fi
existing=$(gh release view "$tag" --repo "$repo" --json assets -q '.assets[].name')
missing=()
for a in "${assets[@]}"; do
  n=$(basename "$a")
  if grep -qxF "$n" <<< "$existing"; then
    echo "publish.sh: $n is already on $tag; leaving it in place" >&2
  else
    missing+=("$a")
  fi
done
[ ${#missing[@]} -eq 0 ] || gh release upload "$tag" --repo "$repo" "${missing[@]}"
echo "published ${#missing[@]} new files to $tag"
