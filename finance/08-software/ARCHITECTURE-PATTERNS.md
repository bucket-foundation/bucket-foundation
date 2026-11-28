# Architecture Patterns

Recurring designs across the 302 cards in this folder, read from source on 2026-11-27. Counts come from keyword matches over card sections, so they are approximate.

## Engine Shapes

| Shape | Cards | Examples | Trait |
|---|---|---|---|
| Event-driven loop | 42 | nautilus_trader, lean, backtrader, bbgo, alpha-rptr | Market data, order and fill events call strategy callbacks; the same strategy class runs in backtest and live |
| Vectorized | 40 | vectorbt, bt, ffn, skfolio, riskfolio-lib | Whole price arrays processed at once; fast parameter sweeps; no order-level realism |
| Async websocket service | 47 | hummingbot, poly-maker, kalshimarketmaker, pmxt | One asyncio process with book streams, a quoting task and a reconciler |
| Message bus and actors | 11 | nautilus_trader, exchange-core, opentrader | Components talk through a bus or ring buffer; single-writer pipelines give replay and low latency |
| Timed polling loop | 61 | freqtrade, pycryptobot, binance-trade-bot, Binance-News-Sentiment-Bot | Fetch candles on an interval, compute indicators, act; simplest and most common in retail bots |
| Batch ML pipeline | 20 and up | qlib, finrl, alphapy, machine-learning-for-trading | Load, engineer features, train, predict, then hand signals to a separate backtester |

Mature engines (Nautilus, LEAN, bbgo, hftbacktest) put the event loop at the center and make the backtest a replay of recorded events through the same code path as live. Vectorized tools stay on the research side of the stack.

## Data Layers

- Files first: parquet, CSV or HDF5 appear in 52 cards. Qlib, vectorbt and quantjourney-bt read local files.
- Yahoo through yfinance feeds 44 cards, mostly the research and portfolio libraries.
- SQL stores (SQLite, Postgres, MySQL) appear in 41 cards. Freqtrade, bbgo and poly-maker keep orders and trades there; bbgo also stores klines.
- Websocket streams feed 33 live engines. Redis or Kafka appear in 10 cards for fan-out.
- Normalized market structures (OHLCV, order book, trade) come from ccxt or a venue adapter. Two cards use DuckDB.
- Scrapers (investpy, finvizfinance, akshare, tushare) cover free fundamentals and Asian markets and break when sites change.

## Broker And Venue Adapters

- A common interface per venue is the core pattern: bbgo `types.Exchange`, goex `api.go`, ccxt `Exchange`, Nautilus data and execution clients, lumibot brokers.
- Strategy code never imports a venue SDK. Swapping Binance for Bybit changes configuration.
- Paper and backtest venues implement the same interface (alpha-rptr `stub` and `backtest`, bbgo backtest exchange).
- Venue counts in connector sections: Binance 46, Polymarket or Kalshi 30, IBKR 18, OKX or Bybit 17, ccxt 17, Alpaca 14, MT5 3.
- Backtrader adapters (alpaca-backtrader-api) split into store, broker and data feed.
- Prediction-market clients (py-clob-client, pmxt, polymarket-cli) are thin REST and signing wrappers; the strategy layer lives elsewhere.

## Risk Modules

Of 302 cards, 98 ship no risk code, 43 stop at per-trade stop-loss and trailing stop, and 42 add drawdown limits or a daily kill switch. The rest hold position caps, rate limits or cost checks.

- Pre-trade checks in a separate stage before the matcher or order router (exchange-core `RiskEngine`, Nautilus risk engine).
- Kill switch and dead-man heartbeat (poly-maker).
- Reconciliation of live orders against target quotes (poly-maker, bbgo active order book).
- Inventory skew in market makers (hummingbot, poly-maker, bbgo bollmaker).
- Contract-level profit guard in on-chain arbitrage (amm-arbitrageur reverts when profit is below gas).

## AI Components

106 cards mention an AI component. Three roles repeat: LLM analysts that write a view and a rating (tradingagents, ai-hedge-fund), forecasting models behind a stable API (timecopilot, qlib), and agent arenas that rank models on live capital (nof0). The cards that execute orders keep the LLM out of the order path or add an approval step.

## What Mature Repos Share

1. One strategy interface that runs in backtest, paper and live.
2. A venue adapter boundary with normalized order, book and balance types.
3. Persistent state for orders and positions, with reconciliation on restart.
4. Configuration files for strategy parameters, with search spaces for optimization (hyperopt in alpha-rptr and freqtrade, optuna elsewhere).
5. Explicit cost models: fees, slippage, funding.
6. A risk stage independent of strategy code.
7. Tests that replay recorded data, plus CI.
8. Notifications to Telegram or a web dashboard (freqtrade, pycryptobot, bbgo).

## Gaps Seen Across Cards

- About a third of the retail bots have no risk code.
- Stale venues: Bittrex, FTX, TD Ameritrade and Gekko appear in cards that no longer run.
- Licenses missing or restrictive (none, GPL, AGPL, Commons Clause) decide reuse more than code quality does.
