#!/usr/bin/env bash
set -euo pipefail
suite="$1"
shift
npm install --silent --no-save --prefix /tmp/bun bun@1.4.2
export PATH="/tmp/bun/node_modules/.bin:$PATH"
bun install --frozen-lockfile
if [ "$suite" = "placement" ]; then
  npx playwright test -c ux-freeze/placement/playwright.config.ts "$@"
  exit
fi
(cd ../bkt && bun install --frozen-lockfile && bun run pack:content > /dev/null)
bun run build > /dev/null
npx playwright test -c ux-freeze/playwright.config.ts "$@"
