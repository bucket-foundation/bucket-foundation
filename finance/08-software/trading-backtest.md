# trading-backtest

https://github.com/lukstei/trading-backtest. License MIT. Stars 353. Last push 2026-11-09. Java. Checked 2026-11-27.

## Architecture
Gradle project. `lib/backtest` (`Backtest`, `BacktestTradingContext`, orders, `TradeStats`), `lib/model` (`TradingStrategy`, `TradingContext`, `Bar`, `Order`), `lib/series` (time series types), `lib/util` (price services, statistics), `main/strategy` (strategies, Kalman filter), `main/r/report.r` for reports.

## Data Layer
`CsvHistoricalPriceService` and `AlphaVantageHistoricalPriceService`; sample data under `data/`.

## Event Loop
Bar loop: `Backtest` advances time and calls `onTick` on each strategy with a trading context.

## Execution
Simulated orders in `BacktestTradingContext` with leverage and fund accounting.

## Risk
Leverage cap of 4 in the strategy sizing, trade statistics in `TradeStats`. No stop logic.

## Strategies Shipped
`CointegrationTradingStrategy`: Kalman filter estimates the hedge ratio and intercept between two prices; trade both legs when the error exceeds the 15-bar standard deviation, close on sign change. `BuyAndHold`. `MultipleTradingStrategy` runs several pairs by weight.

## AI Components
Kalman filter state estimation only.

## Connectors
Alpha Vantage, CSV.

## Fit
Readable pairs trading backtester on the JVM. Small and test covered; research grade.
