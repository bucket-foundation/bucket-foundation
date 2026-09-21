#!/usr/bin/env bash
# Wires scripts/pre-push-vercel-check.sh into this clone's hooks directory.
#
# The AGFarms machines point core.hooksPath at the org's shared hooks
# directory, whose pre-commit enforces the writing voice. This adds a
# pre-push beside it that runs a repository's own
# scripts/pre-push-vercel-check.sh when the repository has one and does
# nothing otherwise, so other repositories sharing the directory are
# unaffected. An existing pre-push is left alone. Run it once per machine:
#   bash scripts/install-git-hooks.sh

set -euo pipefail

TOP="$(git rev-parse --show-toplevel)"
HOOKS="$(git config --get core.hooksPath || true)"
SHARED=""
if [[ -z "$HOOKS" ]]; then
  HOOKS="$(git rev-parse --git-common-dir)/hooks"
elif [[ "${HOOKS/#\~/$HOME}" != "$TOP"/* ]]; then
  SHARED="yes"
fi
# A shared hooks directory serves every repository on the machine, so an
# npm install in this one does not write there. AGF_INSTALL_HOOKS=1 asks
# for it, which is what running this script by hand means.
if [[ -n "$SHARED" && -z "${AGF_INSTALL_HOOKS:-}" && -n "${npm_lifecycle_event:-}" ]]; then
  echo "core.hooksPath is $HOOKS, shared with other repositories; leaving it alone."
  echo "To install the pre-push check there: AGF_INSTALL_HOOKS=1 bash scripts/install-git-hooks.sh"
  exit 0
fi
HOOKS="${HOOKS/#\~/$HOME}"
[[ "$HOOKS" = /* ]] || HOOKS="$TOP/$HOOKS"
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
