#!/usr/bin/env bash
set -euo pipefail
npm install --silent --no-save --prefix /tmp/bun bun@1.4.2
export PATH="/tmp/bun/node_modules/.bin:$PATH"
bun install --frozen-lockfile
(cd ../bkt && bun install --frozen-lockfile && bun run pack:content > /dev/null)
bun run build > /dev/null
npx playwright test -c brand-shots/playwright.config.ts "$@"
