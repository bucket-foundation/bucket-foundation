#!/usr/bin/env bash
set -euo pipefail

fail() { echo "build-appimage.sh: $*" >&2; exit 1; }

repo=$(cd "$(dirname "$0")/../.." && pwd)
out=${1:-$repo/dist/release}
arch=x86_64
tool_version=1.9.1
tool_sha256=ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0
cache=${XDG_CACHE_HOME:-$HOME/.cache}/bucket-release
tool=${APPIMAGETOOL:-$cache/appimagetool-$tool_version-$arch.AppImage}
version=$(bash "$repo/scripts/release/version.sh")
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "packages/bkt version is malformed: $version"

if [ ! -x "$tool" ]; then
  mkdir -p "$cache"
  curl -fsSL --proto '=https' -o "$tool.part" "https://github.com/AppImage/appimagetool/releases/download/$tool_version/appimagetool-$arch.AppImage"
  echo "$tool_sha256  $tool.part" | sha256sum -c --quiet - || { rm -f "$tool.part"; fail "appimagetool checksum mismatch"; }
  chmod +x "$tool.part" && mv "$tool.part" "$tool"
fi

(cd "$repo/packages/bkt" && bun install --frozen-lockfile >/dev/null && bun run build >/dev/null)
(cd "$repo/packages/bkt-ui" && bun install --frozen-lockfile >/dev/null && bun run build >/dev/null && bun run size)
if [ "${BKT_INCLUDE_STAFF_DATA:-}" != "1" ]; then
  bun "$repo/packages/bkt/scripts/check-no-staff.ts" "$repo/packages/bkt-ui/dist" "$repo/packages/bkt/dist/bkt" "$repo/packages/bkt/content/staff-ros.json" || fail "staff atlas data found in a public build"
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
app=$work/Bucket.AppDir
mkdir -p "$app/usr/bin" "$app/usr/share/bucket" "$app/usr/share/applications" "$app/usr/share/icons/hicolor/256x256/apps"

install -m 0755 "$repo/packages/bkt/dist/bkt" "$app/usr/bin/bkt"
cp -r "$repo/packages/bkt-ui/dist" "$app/usr/share/bucket/ui"
install -m 0644 "$repo/packages/bkt/content/pack.json" "$app/usr/share/bucket/pack.json"
printf '%s\n' "$version" > "$app/usr/share/bucket/version"
install -m 0755 "$repo/scripts/release/appimage/AppRun" "$app/AppRun"
install -m 0644 "$repo/scripts/release/appimage/bucket.desktop" "$app/bucket.desktop"
install -m 0644 "$repo/scripts/release/appimage/bucket.desktop" "$app/usr/share/applications/bucket.desktop"
im=$(command -v magick || command -v convert) || fail "ImageMagick is required"
"$im" "$repo/public/bucket_logo.webp" -background none -resize 256x256 -gravity center -extent 256x256 "$app/bucket.png"
cp "$app/bucket.png" "$app/usr/share/icons/hicolor/256x256/apps/bucket.png"
ln -s bucket.png "$app/.DirIcon"

mkdir -p "$out"
artifact=$out/Bucket-$version-$arch.AppImage
rm -f "$artifact"
ARCH=$arch APPIMAGE_EXTRACT_AND_RUN=1 VERSION=$version "$tool" --no-appstream "$app" "$artifact" >/dev/null 2>"$work/tool.log" || { cat "$work/tool.log" >&2; fail "appimagetool failed"; }
chmod 0755 "$artifact"

bash "$repo/scripts/release/appimage-size.sh" "$artifact" "$app"
echo "$artifact"
