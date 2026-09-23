#!/usr/bin/env bash

set -euo pipefail

TOP="$(git rev-parse --show-toplevel)"
HOOKS="$(git config --get core.hooksPath || true)"
CONFIGURED="yes"
if [[ -z "$HOOKS" ]]; then
  CONFIGURED=""
  HOOKS="$(git rev-parse --git-common-dir)/hooks"
fi
HOOKS="${HOOKS/#\~/$HOME}"
[[ "$HOOKS" = /* ]] || HOOKS="$TOP/$HOOKS"
SHARED=""
if [[ -n "$CONFIGURED" && "$HOOKS" != "$TOP"/* ]]; then
  SHARED="yes"
fi
if [[ -n "$SHARED" && -z "${AGF_INSTALL_HOOKS:-}" && -n "${npm_lifecycle_event:-}" ]]; then
  echo "core.hooksPath is $HOOKS, shared with other repositories; leaving it alone."
  echo "To install the pre-push check there: AGF_INSTALL_HOOKS=1 bash scripts/install-git-hooks.sh"
  exit 0
fi
mkdir -p "$HOOKS"

TARGET="$HOOKS/pre-push"
MARK="runs a repository's own scripts/pre-push-vercel-check.sh"
if [[ -e "$TARGET" ]] && ! grep -qF "$MARK" "$TARGET"; then
  echo "A pre-push hook already exists at $TARGET and is not this one; left alone."
  echo "Add this line to it to run the check: bash \"\$(git rev-parse --show-toplevel)/scripts/pre-push-vercel-check.sh\" \"\$@\""
  exit 1
fi

cat >"$TARGET" <<'HOOK'
#!/usr/bin/env bash
# Pre-push: runs a repository's own scripts/pre-push-vercel-check.sh when it
# has one, and does nothing otherwise. Installed by
# scripts/install-git-hooks.sh in bucket-foundation.
# Bypass: AGF_PREPUSH_SKIP=1 git push ...
[ -n "${AGF_PREPUSH_SKIP:-}" ] && exit 0
top="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
check="$top/scripts/pre-push-vercel-check.sh"
[ -f "$check" ] || exit 0
exec bash "$check" "$@"
HOOK
chmod +x "$TARGET"
echo "Installed $TARGET"
