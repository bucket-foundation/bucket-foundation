# binance-trading-bot

https://github.com/chrisleekr/binance-trading-bot. License Apache-2.0. Stars 5,627. Last push 2026-11-22. TypeScript (Bun). Checked 2026-11-27.

## Architecture
Monorepo. `apps/`: api, server, web (dashboard), worker. `packages/`: binance, strategy (core, trailing-trade, momentum, rebalance, backtest, registry), indicators, llm, money, notify, db, observability. The worker runs tick pipelines, queues, sharding, a user-data stream and notifiers.

## Data Layer
Binance REST and websocket candles and order book; indicator computer worker; database state.

## Event Loop
Per-symbol tick in `apps/worker/src/tick`, driven by market-data events and cron jobs.

## Execution
Binance spot orders with client order ids, executor decisions per tick, user-stream fill reconciliation.

## Risk
Entry and exit blockers, loss cooldown, force-sell guards, protective and trailing stops, feasibility and fee checks.

## Strategies Shipped
`packages/strategy/trailing-trade` (grid ladder buy on dips with trailing sell, mean-reversion and technicals gates), `packages/strategy/momentum` (breakout, MA cluster, OBV lead, relative strength, trend filter and quality, exhaustion, weekend gap, trailing stop), `packages/strategy/rebalance` (portfolio rebalance).

## AI Components
`packages/llm/src/advisor.ts`: an LLM proposes config patches from backtest results, validated against the schema before use. MCP endpoint lets an agent read and tune the bot.

## Connectors
Binance.

## Fit
Mature single-venue crypto bot with notifications and an LLM advisor gated by schema checks.
