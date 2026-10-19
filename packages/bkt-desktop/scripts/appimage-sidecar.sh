#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bundle="$here/src-tauri/target/release/bundle/appimage"
sidecar="$here/src-tauri/binaries/bkt-$(uname -m)-unknown-linux-gnu"
version="$(jq -r .version "$here/src-tauri/tauri.conf.json")"

check() {
  local app="$1" tmp ok=0
  tmp="$(mktemp -d)"
  (cd "$tmp" && "$app" --appimage-extract usr/bin/bkt > /dev/null)
  cmp -s "$tmp/squashfs-root/usr/bin/bkt" "$sidecar" && "$tmp/squashfs-root/usr/bin/bkt" --version > /dev/null || ok=1
  rm -rf "$tmp"
  if [ "$ok" -ne 0 ]; then
    echo "the bkt sidecar in $app differs from $sidecar or does not run" >&2
    return 1
  fi
  echo "bkt sidecar intact in $app"
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
  app="$bundle/Bucket_${version}_amd64.AppImage"
  if check "$app"; then return 0; fi
  cp "$sidecar" "$bundle/Bucket.AppDir/usr/bin/bkt"
  rm -f "$app"
  (cd "$bundle" && ARCH="$(uname -m)" LDAI_OUTPUT="$(basename "$app")" APPIMAGE_EXTRACT_AND_RUN=1 "$HOME/.cache/tauri/linuxdeploy-plugin-appimage.AppImage" --appdir Bucket.AppDir > /dev/null)
  check "$app"
}

case "${1:-}" in
  check) check "$(realpath "$2")" ;;
  build) shift; build "$@" ;;
  *) echo "usage: appimage-sidecar.sh build [tauri args] | check <AppImage>" >&2; exit 2 ;;
esac
