# FinTA

https://github.com/peerchemist/finta. License LGPL-3.0. Stars 2,265. Last push 2022-07-24. Python. Checked 2026-11-27.

## Architecture
One class `TA` in `finta/finta.py` (2,307 lines) with 92 classmethod indicators taking an OHLC DataFrame and returning a Series or DataFrame; `utils.py` holds helpers.

## Data Layer
Pandas DataFrames with lowercase `open`, `high`, `low`, `close`, `volume` columns.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. Indicator functions include SMA, EMA, DEMA, TEMA, KAMA, ZLEMA, VIDYA, MACD, RSI, Bollinger bands, Ichimoku, pivot points and Williams measures.

## AI Components
None.

## Connectors
None.

## Fit
Pure-pandas indicator set with no TA-Lib dependency. Fine for feature columns in research; check each formula against its source before use.
