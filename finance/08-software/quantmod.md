# quantmod

https://github.com/joshuaulrich/quantmod. License GPL-3.0. Stars 909. Last push 2026-11-22. R, version 0.4.29.1. Checked 2026-11-27.

## Architecture
R package with about 65 files in `R/`. Groups: data loading (`getSymbols.R`, `loadSymbols.R`, `getQuote.R`, `getFinancials.R`, `getDividends.R`, `getSplits.R`, `getOptionChain.R`, `oanda.R`), transformations (`OHLC.transformations.R`, `Price.transformations.R`, `periodReturn.R`, `returnBy.R`), charting (`chartSeries.R`, `chart_Series.R`, `addTA.R` and many `add*` indicators), and a modeling workflow (`specifyModel.R`, `buildModel.R`, `modelData.R`, `modelSignal.R`, `tradeModel.R`, `tradeLog.R`).

## Data Layer
`getSymbols` loads into the environment as xts series from pluggable methods: Yahoo, FRED, Oanda, Alpha Vantage, Tiingo, CSV, SQLite and MySQL. The `getSymbols.skeleton.R` template defines a new source. Options chains come from Yahoo and ORATS.

## Event Loop
None. Vectorized xts calls.

## Execution
`tradeModel` evaluates a model's signal into a hypothetical position series and `tradeLog` summarizes it. No order placement.

## Risk
None beyond return summaries.

## Strategies Shipped
None. The package ships TA wrappers (TTR indicators), the model-building workflow, and indicators such as Aroon, CMF, MFI, OBV, KST, ZigZag and Williams %R.

## AI Components
None. `buildModel` fits standard R models (lm, glm, randomForest and others) to indicator columns.

## Connectors
Yahoo, FRED, Oanda, Alpha Vantage, Tiingo and SQL databases.

## Fit
Standard R toolkit for pulling prices and charting them with indicators. Pairs with TTR, xts and PerformanceAnalytics. GPL-3.0 licensing applies to derivative R packages.
