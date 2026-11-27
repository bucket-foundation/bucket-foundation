# quant

https://github.com/paulperry/quant. License FMIT (Feedback MIT License, copyright 2014 Paul O. Perry). Stars 462. Last push 2015-07-14. Python. Checked 2026-11-27.

## Architecture
Five short Zipline algorithm files (`swensen.py`, `spy_100.py`, `vti_agg_5050.py`, `vti_agg_6040.py`, `vti_agg_7030.py`) plus notebooks for ETF studies, lazy-portfolio backtests and an online portfolio selection comparison.

## Data Layer
Zipline bundled data and `symbols()` lookup. Notebooks pull ETF histories.

## Event Loop
Zipline `initialize` and `handle_data`, run in daily or minute simulation. The authors state the algorithms are compatible with live trading through Zipline brokers.

## Execution
`order_target_percent` to target weights in a long-only book (`set_long_only`).

## Risk
Threshold rebalance only: all six ETFs are reset when any weight drifts 5 percent from target, with a 20-day minimum between rebalances. Taxes are not modelled.

## Strategies Shipped
`swensen.py`: six-ETF Swensen allocation (TIP, TLT, VNQ, EEM, EFA, VTI at 15/15/15/10/15/30). `vti_agg_*.py`: VTI and AGG stock-bond mixes at 50/50, 60/40 and 70/30. `spy_100.py`: all-SPY benchmark.

## AI Components
None.

## Connectors
Zipline only.

## Fit
Passive allocation baselines for a benchmark set. Zipline-era (2015) code needs porting to a maintained fork.
