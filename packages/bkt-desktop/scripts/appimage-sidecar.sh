#!/usr/bin/env bash
set -euo pipefail
[ "$(uname -m)" = x86_64 ] || { echo "appimage-sidecar.sh builds and checks the x86_64 AppImage only" >&2; exit 2; }
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bundle="$here/src-tauri/target/release/bundle/appimage"
sidecar="$here/src-tauri/binaries/bkt-$(uname -m)-unknown-linux-gnu"

describe() {
  if [ -L "$1" ]; then echo "  $1 -> $(readlink "$1")"; fi
  if [ -f "$1" ]; then echo "  $1: $(stat -Lc %s "$1") bytes, sha256 $(sha256sum < "$1" | cut -c1-64), $(file -bL "$1" | cut -c1-80)"; else echo "  $1: missing"; fi
}

check() {
  local app="$1" tmp inner out
  tmp="$(mktemp -d)"
  (cd "$tmp" && "$app" --appimage-extract usr/bin/bkt > /dev/null)
  inner="$tmp/squashfs-root/usr/bin/bkt"
  if ! cmp -s "$inner" "$sidecar"; then
    echo "the bkt sidecar in $app differs from the one the build bundled" >&2
    describe "$inner" >&2
    describe "$sidecar" >&2
    cmp "$inner" "$sidecar" >&2 || true
    rm -rf "$tmp"
    return 1
  fi
  if ! out="$("$inner" --version 2>&1)"; then
    echo "the bkt sidecar in $app matches $sidecar but does not run:" >&2
    echo "$out" | tail -5 >&2
    rm -rf "$tmp"
    return 1
  fi
  rm -rf "$tmp"
  echo "bkt sidecar intact in $app: $(stat -Lc %s "$sidecar") bytes, sha256 $(sha256sum < "$sidecar" | cut -c1-64), $out"
}

build() {
  local shim pc lib app
  shim="$(mktemp -d)"
  cat > "$shim/ldd" <<EOF
#!/usr/bin/env bash
/usr/bin/ldd "\$@" && exit 0
case "\$(basename "\${@: -1}")" in bkt) printf '\tlinux-vdso.so.1\n'; exit 0;; esac
exit 1
EOF
  chmod +x "$shim/ldd"
  pc="${PKG_CONFIG_PATH:-}"
  if ! pkg-config --exists librsvg-2.0; then
    lib="$(dirname "$(ldconfig -p | awk '/librsvg-2\.so\.2 .*x86-64/ {print $NF; exit}')")"
    printf 'libdir=%s\nName: librsvg\nDescription: librsvg\nVersion: 2\nLibs: -L${libdir} -lrsvg-2\n' "$lib" > "$shim/librsvg-2.0.pc"
    pc="$shim${pc:+:$pc}"
  fi
  (cd "$here" && PATH="$shim:$PATH" PKG_CONFIG_PATH="$pc" NO_STRIP=true bunx tauri build --bundles appimage "$@")
  rm -rf "$shim"
  repack
}

repack() {
  local apps=("$bundle"/*.AppImage) plugin="$HOME/.cache/tauri/linuxdeploy-plugin-appimage.AppImage" app
  [ "${#apps[@]}" -eq 1 ] && [ -f "${apps[0]}" ] || { echo "expected one AppImage in $bundle, found ${#apps[@]}; run tauri build --bundles appimage first" >&2; return 1; }
  app="${apps[0]}"
  if check "$app" 2> /dev/null; then return 0; fi
  [ -x "$plugin" ] || { echo "no linuxdeploy appimage plugin at $plugin; tauri build downloads it on its first AppImage build" >&2; return 1; }
  echo "linuxdeploy rewrote the bkt sidecar; putting the built one back and packing the AppImage again"
  cp "$sidecar" "$bundle/Bucket.AppDir/usr/bin/bkt"
  rm -f "$app"
  (cd "$bundle" && ARCH="$(uname -m)" LDAI_OUTPUT="$(basename "$app")" APPIMAGE_EXTRACT_AND_RUN=1 "$plugin" --appdir Bucket.AppDir > /dev/null)
  check "$app"
  if [ -f "$app.sig" ]; then
    rm -f "$app.sig"
    [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ] || { echo "the updater signature belonged to the AppImage before repacking, and no signing key is set to sign it again" >&2; return 1; }
    (cd "$here" && bunx tauri signer sign "$app" > /dev/null)
    [ -f "$app.sig" ] || { echo "signing the repacked AppImage wrote no $app.sig" >&2; return 1; }
  fi
}

case "${1:-}" in
  check) check "$(realpath "$2")" ;;
  build) shift; build "$@" ;;
  repack) repack ;;
  *) echo "usage: appimage-sidecar.sh build [tauri args] | repack | check <AppImage>" >&2; exit 2 ;;
esac
