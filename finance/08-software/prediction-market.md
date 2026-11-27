# prediction-market

https://github.com/kuest/prediction-market. License Modified MIT with Commons Clause (listed Other). Stars 1,108. Last push 2026-11-27. TypeScript (Next.js). Checked 2026-11-27.

## Architecture
Next.js 16 app on Bun with Drizzle ORM and Supabase. `src/app/api/` routes (markets, events, arbitrage, leaderboard, payments, sync, lifi, sumsub), `src/lib/` (CLOB client, market making, UMA resolution, arbitrage, AI), `scripts/` sync jobs, `infra/` for Cloud Run, Fly, Kubernetes and Railway.

## Data Layer
Postgres through Drizzle with `db:push` at build. Cron scripts sync events, event creations, resolution, sports scores, volume and translations.

## Event Loop
Scheduled sync scripts and request handlers. No resident trading loop.

## Execution
Orders through `@polymarket/clob-client-v2` and Kuest CLOB code in `src/lib/clob.ts`. `arbitrage-execution.ts` places paired orders on Kuest and Polymarket. Wallets via Reown AppKit, wagmi and viem with SIWE login.

## Risk
Geoblock check, Sumsub identity verification, arbitrage order security checks, market-maker escrow module and trading fee schedules.

## Strategies Shipped
`src/lib/arbitrage-quote.ts`: pairs YES on one venue with NO on the other across book levels and reports edge, cost and payout. `src/lib/market-making-pricing.ts`: market-making price rules for admin markets.

## AI Components
`src/lib/ai/`: OpenRouter calls for market context and event creation decisions.

## Connectors
Polymarket CLOB, UMA, LI.FI, Sumsub, OpenRouter, Supabase.

## Fit
Full white-label prediction market front end with a cross-venue arbitrage quote. Source-available license; check terms before reuse.
