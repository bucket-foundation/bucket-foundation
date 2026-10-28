#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: tag.sh <version> [--push] [--remote <name>]" >&2; exit 2; }

v=${1:-}; [ -n "$v" ] || usage; shift
[[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "tag.sh: malformed version: $v" >&2; exit 1; }
push=0; remote=origin
while [ $# -gt 0 ]; do
  case "$1" in
    --push) push=1 ;;
    --remote) remote=${2:-}; [ -n "$remote" ] || usage; shift ;;
    *) usage ;;
  esac
  shift
done

tag="bkt-v$v"
git fetch -q "$remote" main --tags
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "tag.sh: $tag already exists at $(git rev-parse --short "$tag^{commit}")" >&2; exit 1
fi

merge_re='^Merge pull request #[0-9]+ from [^[:space:]]+/dev$'
sha=""
for c in $(git rev-list --first-parent --merges --max-count=50 "$remote/main"); do
  if [[ "$(git log -1 --format=%s "$c")" =~ $merge_re ]]; then sha=$c; break; fi
done
[ -n "$sha" ] || { echo "tag.sh: no dev-to-main merge in the last 50 merges on $remote/main" >&2; exit 1; }

if git log -1 --format=%B "$sha" | grep -qiF '[skip ci]'; then
  echo "tag.sh: $sha carries [skip ci]; refusing to tag it" >&2; exit 1
fi

git tag -a "$tag" -m "$tag" "$sha"
echo "tag.sh: $tag -> $(git log -1 --format='%h %s' "$sha")"
if [ "$push" = 1 ]; then
  git push "$remote" "refs/tags/$tag"
else
  echo "tag.sh: run 'git push $remote refs/tags/$tag' to start bkt-desktop and bkt-mobile"
fi
