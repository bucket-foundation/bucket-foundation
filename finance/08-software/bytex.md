# bytex

https://github.com/BYTEX-TRADE/bytex. License Apache License 2.0. Stars 302. Last push 2026-10-02. C#. Checked 2026-11-27.

## Architecture
.NET solution in `src/`: `Bytex.Core` (engines, portfolios, caching, messaging, `TradingRuntime`), `Bytex.Backtest`, `Bytex.Live`, `Bytex.Indicators`, `Bytex.Data`, `Bytex.Documents` (strategy as a node graph), `Bytex.Cli`, ten venue adapter projects and Postgres, Redis and S3 persistence. Pre-release.

## Data Layer
Adapter data clients and history loaders (Binance, Bybit, Bitget, Gate, Hyperliquid, Kraken, Kucoin, Okx, Databento, Tardis). Postgres, Redis and S3 store state and archives.

## Event Loop
Single-threaded runtime that processes each event in a defined order, so a replayed backtest repeats exactly.

## Execution
One strategy API for backtest, sandbox (live data, simulated fills) and live. Per-instrument matching engine with fill, slippage and fee models; fixed-point decimal money; reconciliation at start-up.

## Risk
Pre-trade checks on precision, size, notional and rate; margin checks; a loss limit counting open and realised results with a trading stop.

## Strategies Shipped
`examples/Bytex.Examples/Strategies/EmaCross.cs`. Strategy documents define data, indicators, conditions, actions and risk as a validated graph.

## AI Components
None.

## Connectors
Ten exchange and data adapters, each split into data and execution clients.

## Fit
Closest .NET peer to Nautilus Trader. Good reference for adapter layout and a shared backtest and live path.
