# kelp

https://github.com/stellar-deprecated/kelp. License Apache-2.0 (listed Other). Stars 1,123. Last push 2023-11-03. Go. Checked 2026-11-27.

## Architecture
Go service. `trader/trader.go` (`MakeTrader`, `Start`, `update`), `plugins/` (strategies, level providers, filters, price feeds, exchange adapters), `api/` (interfaces for exchange, strategy, level, price feed), `terminator/`, `kelpdb/` (schema), `accounting/pnl`, `gui/` (web UI backend) and `cmd/` (`trade`, `exchanges`, `strategies`, `terminate`).

## Data Layer
Orderbook, balances and open offers fetched from Stellar Horizon or an exchange each cycle. Fills written to a database by `fillDBWriter.go`. Feeds from CoinMarketCap, an FX source (OXR), other exchanges and fixed values.

## Event Loop
Timed update loop in `Trader.Start`. Each cycle syncs balances, offers and trades, asks the strategy for offer changes, then submits create, update and delete operations. Metric updates and a Binance websocket path exist.

## Execution
Stellar `ManageSellOffer` operations through Horizon; CEX orders through `ccxt-rest` and native Kraken and Binance adapters. A batched exchange wrapper groups submissions.

## Risk
Submit filters: max price, min price, volume, order constraints and maker-mode. Terminator deletes all offers. No portfolio limits.

## Strategies Shipped
`buysell`, `sell`, `mirror`, `balanced`, `pendulum`, `delete`, `sell_twap`, `buy_twap` (see `plugins/factory.go`).

## AI Components
None.

## Connectors
Stellar Horizon, ccxt-rest exchanges, CoinMarketCap, OpenExchangeRates.

## Fit
Complete market-maker design with level providers and filters separated from strategy. Repository is archived under stellar-deprecated.
