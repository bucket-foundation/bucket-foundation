# empyrical-reloaded

https://github.com/stefan-jansen/empyrical-reloaded. License Apache-2.0. Stars 133. Last push 2026-11-24. Python. Checked 2026-11-27.

## Architecture
`src/empyrical/stats.py` (returns, drawdown, Sharpe, Sortino, alpha, beta, capture ratios, VaR), `perf_attrib.py` (factor attribution), `periods.py`. Maintained fork of Quantopian's empyrical used by zipline-reloaded and pyfolio-reloaded.

## Data Layer
Return series passed in.

## Event Loop / Execution / Strategies / AI / Connectors
None.

## Risk
Metrics only.

## Fit
Lightweight metric functions for code paths where QuantStats is too heavy.
