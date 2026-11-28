# gekko

https://github.com/askmike/gekko. License MIT. Stars 10,180. Last push 2020-02-16. JavaScript. Checked 2026-11-27.

## Architecture
Node pipeline (`core/pipeline.js`, `core/gekkoStream.js`) that wires plugins into a stream: `plugins/` (tradingAdvisor, trader, paperTrader, performanceAnalyzer, sqlite, postgresql, mongodb, notifiers), `strategies/`, `exchange/` broker layer, `importers/`, and a Vue web UI under `web/`.

## Data Layer
Candle batcher (`core/candleBatcher.js`) turns trades into candles. Storage adapters: SQLite, PostgreSQL, MongoDB. Importers pull history from nine exchanges.

## Event Loop
Event emitter stream. Each candle triggers the strategy `check`; advice events flow to the trader or paper trader. Backtest replays stored candles through the same stream.

## Execution
`exchange/gekkoBroker.js` with `portfolioManager.js`, sticky orders (`orders/sticky.js`) and trigger classes. Wrappers include Binance, Bittrex, Poloniex, Kraken, GDAX, Bitfinex, Luno and others.

## Risk
`exchange/triggers/` holds a trailing stop. No portfolio-level limits.

## Strategies Shipped
`RSI.js`, `MACD.js`, `PPO.js`, `DEMA.js`, `TMA.js`, `CCI.js`, `StochRSI.js`, `TSI.js`, plus TA-Lib and Tulip wrappers.

## AI Components
None.

## Connectors
36 files in `exchange/wrappers/`, Telegram, Slack, IRC, mail, Pushover, Redis.

## Fit
Archived 2020 reference for the candle-stream plugin design. Exchange wrappers are outdated.
