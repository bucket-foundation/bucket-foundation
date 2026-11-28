# OctoBot

https://github.com/Drakkar-Software/OctoBot. License GPL-3.0. Stars 6,991. Last push 2026-11-25. Python with some Rust. Checked 2026-11-27.

## Architecture
Pants monorepo under `packages/`: `async_channel` (pub/sub bus), `trading`, `evaluators`, `backtesting`, `services`, `agents`, `copy`, `tentacles_manager`. Strategies and integrations ship as "tentacles": evaluators produce signals, trading modes turn signals into orders.

## Data Layer
Exchange candles, order books and trades through ccxt, cached for backtests. Social and news services (Reddit, Telegram, Google Trends, web) feed social evaluators.

## Event Loop
Async producer and consumer channels. Each new candle or ticker triggers evaluators, whose matrix of notes feeds the trading mode.

## Execution
Trading modes place orders through ccxt with simulated (paper) or real accounts.

## Risk
Per-mode settings: max order size, stop losses in DCA and grid modes, reference market budget.

## Strategies Shipped
Trading modes in `packages/tentacles/Trading/Mode/`: ai, arbitrage, daily, dca, dip_analyser, dsl, grid, index, market_making, simple_market_making, staggered_orders, signal, remote_trading_signals, trading_view_signals, profile_copy. Evaluators: momentum, trend, volatility, pattern, statistics, sentiment, news, forum, instant fluctuations, move signals, mixed strategies, ai and ai_strategies.

## AI Components
`ai_evaluator` and `ai_trading_mode` send market context to an LLM (OpenAI-compatible) and read a signal back; `packages/agents` adds agent runtime.

## Connectors
15+ exchanges through ccxt: Binance, Hyperliquid, Coinbase, Kraken, OKX, Bybit and others. TradingView webhooks.

## Fit
Ready crypto grid, DCA and TradingView-signal bot with a web UI and paper mode. Its TradingView webhook mode doubles as an alert receiver.
