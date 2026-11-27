# TTR

https://github.com/joshuaulrich/TTR. License GPL-2.0. Stars 351. Last push 2026-02-28. R. Checked 2026-11-27.

## Architecture
R package, version 0.24.4.1, with 45 files in `R/`. Each file holds one indicator family: `MovingAverages.R`, `MACD.R`, `RSI.R`, `ADX.R`, `bollingerBands.R`, `stochastics.R`, `SAR.R`, `ZigZag.R`, `DonchianChannel.R`, `keltnerChannels.R`, `pivots.R`.

## Data Layer
Functions take xts, zoo or numeric vectors and return the same class. `WebData.R` has `getYahooData` and `stockSymbols` for fetching prices and symbol lists.

## Event Loop
None. Vectorized functions over a series, with rolling helpers in `rollFun.R` and `runFun.R`.

## Execution
None.

## Risk
None. `volatility.R` and `ATR.R` compute volatility estimators and true range.

## Strategies Shipped
None. Indicators only; `quantstrat` and `blotter` consume them as signal inputs.

## AI Components
None.

## Connectors
Yahoo Finance and nasdaq.com symbol lists through `WebData.R`.

## Fit
Reference for indicator math in R, including the less common ones (CTI, TDI, GMMA, KST, VHF). Port source for indicator tests in other languages.
