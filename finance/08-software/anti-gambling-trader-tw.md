# anti-gambling-trader-tw

https://github.com/mars-tw/anti-gambling-trader-tw. License MIT. Stars 1,187. Last push 2026-11-02. Python. Checked 2026-11-27.

## Architecture
Package `core/` with modules for `analyzer`, `forensics` (statistical tests), `backtest/validate.py` (holdout and walk-forward), `montecarlo`, `verdict` (judge and statistics), `antiscam` (text scanner, guru claim checks), `strategy` (profiler, per-tag verdicts, skeleton generator), `scaffold`, `broker`, `data_api` and `ui` (local web server on 127.0.0.1). CLI in `core/cli.py`.

## Data Layer
Reads a user trade log (CSV, Excel, screenshot ingest). `data_api` providers cover Binance, Pionex and Shioaji public or read-only data. No database.

## Event Loop
Batch analysis run from CLI or UI request. No live loop.

## Execution
`PaperBroker` plus adapter classes for Binance, IBKR, Alpaca, Shioaji, Yuanta, Fubon, KGI, OKX, Bybit, Tradier, Pionex and CCXT behind a `BrokerAdapter` ABC. The generated scaffold defaults to paper.

## Risk
Order validation in `broker/base.py`, a safety gate in generated skeletons, and capital-warning Monte Carlo scenarios. Verdict stages rate whether a trade record shows evidence of skill.

## Strategies Shipped
No fixed strategy. `profile_strategy` infers style from a trade log; `generate_skeleton` emits a backtrader or vectorbt template.

## AI Components
None. Rule and statistics based.

## Connectors
Binance, Pionex, Shioaji data; many broker adapters; LINE scam pattern checks.

## Fit
Retail trader audit tool for judging a strategy record. Useful for its holdout and bootstrap verdict logic.
