# volest

https://github.com/jasonstrimpel/volatility-trading. License GPL-3.0. Stars 1,972. Last push 2024-10-21. Python. Checked 2026-11-27.

## Architecture
Package `volatility/` with `volest.py` (estimator classes) and `models/`: Garman-Klass, Hodges-Tompkins, Parkinson, Rogers-Satchell, Yang-Zhang, close-to-close, plus cones and percentile plots. Follows Sinclair's Volatility Trading.

## Data Layer
User OHLC frames or Yahoo CSV through `data.py`.

## Event Loop
None.

## Execution
None.

## Risk
Volatility cones and rolling percentiles for position sizing.

## Strategies Shipped
Volatility estimators and cone charts used for options trading decisions.

## AI Components
None.

## Connectors
None.

## Fit
Handy estimator set for vol-based sizing and options research.
