# empyrical

https://github.com/quantopian/empyrical. License Apache-2.0. Stars 1,524. Last push 2024-07-26. Python. Checked 2026-11-27.

## Architecture
Three modules: `empyrical/stats.py` (metrics), `perf_attrib.py` (factor attribution) and `utils.py` (data helpers, rolling wrappers). Used by zipline and pyfolio.

## Data Layer
Takes pandas Series or numpy arrays of returns; `_aligned_series` lines up returns and factor returns by index.

## Event Loop
None.

## Execution
None.

## Risk
Core content. `max_drawdown`, `annual_volatility`, `downside_risk`, `sharpe_ratio`, `sortino_ratio`, `calmar_ratio`, `omega_ratio`, `tail_ratio`, `value_at_risk`, `conditional_value_at_risk`, `alpha`, `beta`, `capture` ratios and rolling variants.

## Strategies Shipped
None. `perf_attrib` splits returns into common factor and specific returns from position exposures.

## AI Components
None.

## Connectors
None.

## Fit
Standard, tested metric definitions to reuse for any backtest report. Archived by Quantopian, so no new features.
