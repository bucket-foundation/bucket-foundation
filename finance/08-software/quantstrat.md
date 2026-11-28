# quantstrat

https://github.com/braverock/quantstrat. License GPL-3. Stars 310. Last push 2023-09-14. R. Checked 2026-11-27.

## Architecture
R package with files in `R/`: `strategy.R` (`strategy`, `applyStrategy`), `indicators.R`, `signals.R`, `rules.R` (`add.rule`, `applyRules`), `ruleSignal.R`, `ruleOrderProc.R`, `orders.R`, `osFUNs.R` (order sizing), `paramsets.R`, `walk.forward.R`, `tradeGraphs.R`. Demos in `demo/`.

## Data Layer
xts objects and a `blotter` portfolio and account for books.

## Event Loop
Event-style bar loop inside `applyRules`: indicators, then signals, then rules, then an order book processed each timestamp.

## Execution
Simulated order types: market, limit, stop limit, trailing stop, with order sets and chained rules.

## Risk
Risk rules in the chain (stop loss, trailing stop, take profit). Stats in `deflated.Sharpe.R`, `haircut.Sharpe.R` and `profit.hurdle.R` adjust for multiple testing.

## Strategies Shipped
Demos: MACD, Bollinger bands, Faber rotation, and a Luxor SMA series with parameter sets, MAE and MFE stops, and walk-forward.

## AI Components
None.

## Connectors
quantmod, blotter and FinancialInstrument.

## Fit
Reference for a rules-and-orders backtest model with parameter sets and walk-forward analysis.
