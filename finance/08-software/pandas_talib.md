# pandas_talib

https://github.com/femtotrader/pandas_talib. License MIT. Stars 783. Last push 2018-05-30. Python. Checked 2026-11-27.

## Architecture
One module, `pandas_talib/__init__.py` (488 lines), of pure pandas indicator functions that take a DataFrame and a window and return it with an added column. The repo also commits a TA-Lib source tarball and sample data.

## Data Layer
Caller supplies OHLCV DataFrames. `data/download.py` fetches sample Yahoo history.

## Event Loop
None. Whole-column vectorized pandas operations.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. Indicator set: MA, EMA, MOM, ROC, ATR, BBANDS, pivot points, stochastics, TRIX, ADX, MACD, Mass Index, Vortex, KST, RSI, TSI, accumulation distribution, Chaikin, MFI, OBV, force index, ease of movement, CCI, Coppock, Keltner, ultimate oscillator, Donchian and standard deviation.

## AI Components
None.

## Connectors
None.

## Fit
Dormant since 2018 and marked work in progress. pandas-ta-classic or TA-Lib cover the same indicators with tests and upkeep.
