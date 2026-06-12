#!/usr/bin/env bash
# Serve Bucket Academy locally. Open the printed URL in your browser.
set -e
cd "$(dirname "$0")"
PORT="${1:-8137}"
echo "Bucket Academy → http://localhost:${PORT}"
echo "(Ctrl-C to stop. Progress is saved in your browser's localStorage.)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
