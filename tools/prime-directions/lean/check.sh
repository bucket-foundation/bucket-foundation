#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
lake build
exec ../../../lean/check.sh
