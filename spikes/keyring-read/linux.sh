#!/usr/bin/env bash
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
work=$1
rm -rf "$work"
mkdir -p "$work/home" "$work/run"
chmod 700 "$work/run"
export HOME="$work/home" XDG_DATA_HOME="$work/home/.local/share" XDG_CONFIG_HOME="$work/home/.config" XDG_CACHE_HOME="$work/home/.cache" XDG_RUNTIME_DIR="$work/run"
unset DBUS_SESSION_BUS_ADDRESS GNOME_KEYRING_CONTROL SSH_AUTH_SOCK DISPLAY WAYLAND_DISPLAY
exec dbus-run-session -- bash "$here/linux-inner.sh" "$@"
