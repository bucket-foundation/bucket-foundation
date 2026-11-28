# investments

https://github.com/KonishchevDmitry/investments. License GPL-3.0 or later. Stars 553. Last push 2026-11-26. Rust. Checked 2026-11-27.

## Architecture
Rust CLI (`src/bin/investments`) with `broker_statement/` parsers, `analysis/`, `portfolio/`, `quotes/`, `taxes/`, `tax_statement/`, `deposits/`, `currency/`, `metrics/` and a database layer under `db/` with Diesel `migrations/`.

## Data Layer
Broker statement files parsed per broker (`ib`, `firstrade`, `bcs`, `open`, and others). SQLite cache. Quote providers in `quotes/`: Alpha Vantage, Finnhub, Twelve Data, Stooq, MOEX, T-Bank and a custom provider. Central bank rates in `quotes/cbr`.

## Event Loop
None. Commands run once: analyse, backtest, rebalance, simulate sell, tax statement, deposits, metrics.

## Execution
None. The rebalancer prints orders for the user to place.

## Risk
Portfolio analysis only: rate of return against a deposit benchmark, tax impact, `sell_simulation.rs`.

## Strategies Shipped
None. Rebalancing follows a user-defined target asset allocation.

## AI Components
None.

## Connectors
Interactive Brokers, Firstrade, BCS, Sber, T-Bank and other broker statements. Prometheus metrics export.

## Fit
Personal portfolio accounting tool aimed at Russian tax residents. Statement parsers and tax logic are the reusable parts.
