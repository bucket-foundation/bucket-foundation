# finmarketpy

https://github.com/cuemacro/finmarketpy. License Apache-2.0. Stars 3,830. Last push 2026-04-16. Python. Checked 2026-11-27.

## Architecture
`backtest/` (backtestengine, backtestrequest, tradeanalysis, comparison), `curve/` (FX spot, forward and option total-return indices, vol surfaces), `economics/`. Data through the sister library findatapy (Bloomberg, Quandl, FRED, Yahoo).

## Data Layer
findatapy market data requests.

## Event Loop
Vectorized.

## Execution
None.

## Risk
Vol targeting and position limits in backtest requests.

## Strategies Shipped
`finmarketpy_examples/`: FX trend model (`tradingmodelfxtrend_example.py`), seasonality, events studies, VWAP, technicals.

## AI Components
None.

## Connectors
None.

## Fit
FX-specific: carry-adjusted total-return indices and vol surfaces for an FX sleeve.
