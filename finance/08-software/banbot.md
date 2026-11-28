# banbot

https://github.com/banbox/banbot. License GNU Affero General Public License v3.0. Stars 689. Last Push 2026-11-27. Go. Checked 2026-11-27.

## Architecture
Go module with `data` (feeders, spider, subscriptions), `strat` (job and state types, `OnBar` and `OnBatchJobs` callbacks), `biz` (order manager, shared hub, live runtime), `execution` (plan, rebalance, `risk.go`), `factor` (expression DAG, portfolio, backtest), `opt` (backtest and hyperopt), `orm`, `rpc`, `llm`, `web/ui` and `bandoc`.

## Data Layer
Klines, funding rate, open interest and mark or index series through `data/provider.go` and `series_source.go`. Storage via pgx and modernc sqlite in `orm`. The `kb` package ships strategy-authoring knowledge files.

## Event Loop
Event-driven. Bars flow from `data/feeder.go` into per-symbol strategy jobs; the same code path serves backtest and live. A `determinism.go` guard keeps backtests repeatable.

## Execution
Shared Hub order manager with intent bridge, ladder orders, exchange-side stop and take-profit, trailing stop, and checkpoint takeover. Live accounts are linear perpetuals only. A local order manager simulates fills with intrabar stops.

## Risk
`execution/risk.go` reserves a frozen account budget per plan and rechecks it against settled equity and strategy NAV. `ts_loss_stop.go` and `ts_admission.go` gate time-series entries.

## Strategies Shipped
Time-series Go strategies, a multi-factor cross-sectional engine with portfolio policy, and statistical arbitrage (pairs, PCA, spot-perp carry).

## AI Components
`llm/` holds a model config and a GLM client on the eino framework. `aifea.proto` defines a gRPC feature service.

## Connectors
banexg adapters for Binance, OKX and Bybit, plus Telegram notifications.

## Fit
Heavily tested Go engine with unusual depth in factor research and pairs. Strong reference for a unified backtest and live path.
