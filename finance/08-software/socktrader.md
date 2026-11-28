# SockTrader

https://github.com/SockTrader/SockTrader. License GPL-3.0. Stars 474. Last push 2023-12-01. TypeScript. Checked 2026-11-27.

## Architecture
Nx monorepo. `packages/core` (exchanges, repositories, stores, wallet, worker, interfaces), `packages/cli` (`run` and `web` commands), `apps/demo` (example strategies). Strategies implement the `Strategy` interface with `onStart`.

## Data Layer
Binance candles over websocket as RxJS observables. Postgres through `pg` (`db.ts`, `docker/database/1_schema.sql`) stores imported candles for backtests.

## Event Loop
Reactive: candle and order streams are RxJS subscriptions. A worker (`worker/execution.script.ts`) runs backtests off the main thread.

## Execution
`exchanges/binance` maps orders to the Binance API with an error handler. `local` and `binanceLocal` exchanges simulate fills against stored candles. An Akita-style spot wallet store tracks balances.

## Risk
None beyond wallet balance checks.

## Strategies Shipped
`apps/demo/src/strategies/movingAverageStrategy.ts`: 12 and 24 period SMA crossover on BTCUSDT hourly candles, one position at a time. `localMovingAverageStrategy.ts` backtests it on a Coinbase BTCUSD file. `testStrategy.ts`.

## AI Components
None.

## Connectors
Binance, local simulator.

## Fit
Clean TypeScript pattern for a live and backtest shared strategy interface. Single exchange, no risk layer.
