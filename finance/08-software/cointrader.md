# cointrader

https://github.com/timolson/cointrader. License Apache-2.0 (LICENSE file). Stars 451. Last push 2023-06-14. Java. Checked 2026-11-27.

## Architecture
Maven project `org.cryptocoinpartners`. `bin/` run modes (Backtest, PaperTrade, LiveTrade, SaveData, DumpTicks, Report, ResetDatabase), `module/` services (order, portfolio, quote, circuit breaker, JMX), `esper/` custom views and functions, `schema/` JPA entities with DAOs, `module/xchange/` venue helpers.

## Data Layer
Hibernate JPA persistence of ticks, books, bars, fills, orders and positions. Tick replay from CSV (`ReadTicksCsv`, `ReplayData`).

## Event Loop
Esper complex event processing. EPL files (`BasicQuoteService.epl`, `BasicPortfolioService.epl`) and plug-in views build OHLC and Heikin-Ashi bars and TA-Lib aggregates over streams.

## Execution
`BaseOrderService` with `MockOrderService` for paper and `XchangeOrderService` for live via XChange. `SimpleStatefulStrategy` asks subclasses for entry, stop and exit orders.

## Risk
`CircuitBreaker` can deactivate a listing. Stop orders per fill. Portfolio and position tracking in `BasicPortfolioService`.

## Strategies Shipped
`DemoStrategy`, `SimpleStatefulStrategy` base class and `ConsoleStrategy`. No tuned production strategy.

## AI Components
None. Weka time-series forecasting jar is vendored under `repo/`.

## Connectors
XChange helpers for Binance, Bitfinex, BitMEX, OKCoin and Poloniex.

## Fit
Reference for event-stream strategy architecture on the JVM with one code path for backtest, paper and live. Venue helpers date from before 2019.
