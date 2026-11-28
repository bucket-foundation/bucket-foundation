# OpenTrader

https://github.com/Open-Trader/opentrader. License Apache-2.0. Stars 2,952. Last push 2025-06-29. TypeScript. Checked 2026-11-27.

## Architecture
pnpm monorepo. `app/` holds the CLI and daemon (`cli.ts`, `daemon-rpc.ts`). `packages/` splits `bot`, `bot-processor`, `bot-templates`, `backtesting`, `exchanges`, `indicators`, `event-bus`, `prisma`, `trpc`. Strategies are functions run by the bot processor on each tick.

## Data Layer
Prisma database for bots, orders and candles; exchange candles through the `exchanges` package.

## Event Loop
Event bus plus a bot processor that calls the strategy template on timer and order-fill events; a daemon runs bots as a service.

## Execution
Strategy template emits place and cancel order calls; the processor syncs them to the exchange and records fills.

## Risk
Per-bot settings (investment size, grid range). No portfolio-level kill switch in the open edition; `pro/` is a separate paid tree.

## Strategies Shipped
`bot-templates/src/templates`: `grid-bot.ts` and `grid.ts` (fixed-range grid), `dca.ts` (dollar-cost averaging ladder), `rsi.ts` (RSI threshold trades).

## AI Components
None.

## Connectors
Crypto exchanges through ccxt-style `exchanges` package; paper-trading mode and backtesting package.

## Fit
Readable TypeScript reference for a bot runner with a plug-in strategy model. Strategies are basic. Last push 2025-06.
