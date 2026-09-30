#!/bin/sh
set -eu

RELEASE_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOxLPJ9aXCPCnxg+caf9yG5sBavpDE65sfeX66PkAQLs release@bucket.foundation"
SIGNER="release@bucket.foundation"
NAMESPACE="bucket-release"
REPO="bucket-foundation/bucket-foundation"

fail() { echo "bkt install: $*" >&2; exit 1; }
say() { echo "bkt install: $*" >&2; }

fetch() {
  case "$1" in
    https://*) curl -fsSL --proto '=https' --tlsv1.2 -o "$2" "$1" ;;
    http://*) fail "refusing plain http: $1" ;;
    *) cp -- "$1" "$2" ;;
  esac
}

sha256() {
  if command -v sha256sum > /dev/null 2>&1; then sha256sum -- "$1" | awk '{print $1}'
  elif command -v shasum > /dev/null 2>&1; then shasum -a 256 -- "$1" | awk '{print $1}'
  else fail "need sha256sum or shasum to verify the download"
  fi
}

target() {
  os=$(uname -s)
  arch=$(uname -m)
  case "$os" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) fail "unsupported OS $os; on Windows use scripts/install.ps1" ;;
  esac
  case "$arch" in
    x86_64|amd64) arch=x64 ;;
    arm64|aarch64) arch=arm64 ;;
    *) fail "unsupported CPU $arch" ;;
  esac
  if [ "$os" = darwin ] && [ "$arch" = x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ]; then arch=arm64; fi
  echo "bkt-$os-$arch"
}

latest_tag() {
  curl -fsSL --proto '=https' "https://api.github.com/repos/$REPO/releases?per_page=30" \
    | tr ',' '\n' | sed -n 's/.*"tag_name": *"\(bkt-v[0-9][0-9.]*\)".*/\1/p' | head -n1
}

add_to_path() {
  dir=$1
  case ":${PATH:-}:" in *":$dir:"*) return 0 ;; esac
  if [ "${BKT_NO_MODIFY_PATH:-}" = 1 ]; then
    say "add $dir to your PATH"
    return 0
  fi
  line="export PATH=\"$dir:\$PATH\""
  for rc in "$HOME/.profile" "$HOME/.bashrc" "$HOME/.zshrc"; do
    case "$rc" in
      */.profile) ;;
      */.bashrc) command -v bash > /dev/null 2>&1 || continue ;;
      */.zshrc) [ -f "$rc" ] || [ "$(uname -s)" = Darwin ] || continue ;;
    esac
    if ! grep -qsF "$line" "$rc"; then printf '\n%s\n' "$line" >> "$rc"; fi
  done
  say "added $dir to PATH in your shell profile; open a new terminal or run: $line"
}

main() {
  name=$(target)
  tag=${BKT_VERSION:+bkt-v${BKT_VERSION#bkt-v}}
  base=${BKT_DOWNLOAD_BASE:-}
  if [ -z "$base" ]; then
    [ -n "$tag" ] || tag=$(latest_tag)
    [ -n "$tag" ] || fail "could not find a bkt release; set BKT_VERSION"
    base="https://github.com/$REPO/releases/download/$tag"
  fi
  bindir=${BKT_INSTALL_DIR:-$HOME/.local/bin}
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT INT TERM

  for f in "$name" "$name.sha256" "$name.manifest" "$name.manifest.sig"; do
    fetch "$base/$f" "$work/$f" || fail "download failed: $base/$f"
  done

  actual=$(sha256 "$work/$name")
  listed=$(awk '{print $1; exit}' "$work/$name.sha256")
  manifest_sum=$(awk -F= '$1=="sha256"{print $2; exit}' "$work/$name.manifest")
  manifest_name=$(awk -F= '$1=="name"{print $2; exit}' "$work/$name.manifest")
  version=$(awk -F= '$1=="version"{print $2; exit}' "$work/$name.manifest")
  [ -n "$actual" ] && [ "$actual" = "$listed" ] && [ "$actual" = "$manifest_sum" ] || fail "checksum mismatch for $name"
  [ "$manifest_name" = "$name" ] || fail "manifest names $manifest_name, downloaded $name"
  expires=$(awk -F= '$1=="expires"{print $2; exit}' "$work/$name.manifest")
  case "$expires" in ''|*[!0-9]*) fail "manifest expiry is malformed" ;; esac
  [ "$expires" -gt "$(date +%s)" ] || fail "manifest expired; get a fresh release"

  if command -v ssh-keygen > /dev/null 2>&1; then
    printf '%s namespaces="%s" %s\n' "$SIGNER" "$NAMESPACE" "$RELEASE_PUBKEY" > "$work/allowed_signers"
    ssh-keygen -q -Y verify -f "$work/allowed_signers" -I "$SIGNER" -n "$NAMESPACE" -s "$work/$name.manifest.sig" < "$work/$name.manifest" > /dev/null \
      || fail "signature check failed for $name"
  elif [ "${BKT_REQUIRE_SIGNATURE:-}" = 1 ]; then
    fail "ssh-keygen is missing and BKT_REQUIRE_SIGNATURE=1"
  else
    say "ssh-keygen not found; verified the checksum only"
  fi

  mkdir -p "$bindir"
  install_to="$bindir/bkt"
  cp "$work/$name" "$install_to.new"
  chmod 0755 "$install_to.new"
  mv -f "$install_to.new" "$install_to"
  add_to_path "$bindir"
  say "installed $install_to $version"
}

main "$@"
