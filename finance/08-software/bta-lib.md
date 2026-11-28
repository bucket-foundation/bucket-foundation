# bta-lib

https://github.com/mementum/bta-lib. License MIT. Stars 504. Last push 2022-01-25. Python. Checked 2026-11-27.

## Architecture
Package `btalib/`. `indicator.py` defines `MetaIndicator` and registry helpers (`get_indicators`, `get_ind_by_group`). `indicators/` has about 50 indicator modules: `sma`, `ema`, `macd`, `rsi`, `bbands`, `atr`, `stochastic`, `sar`, `ht_*` Hilbert transform family, `mama`, `kama`, `t3`, `obv`, `mfi`. `meta/` holds the input and line machinery.

## Data Layer
Pandas dataframes and series in, line objects out. Only dependency is pandas.

## Event Loop
None. Indicators compute over whole series.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
None. Part of the backtrader family.

## Fit
Pandas indicator library covering the TA-Lib set without a C dependency. Dormant since January 2022.
