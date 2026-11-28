# options-implied-probability

https://github.com/Open-Lemma/options-implied-probability. License Apache License 2.0. Stars 356. Last push 2026-04-29. Python. Checked 2026-11-27.

## Architecture
Library package `oipd/` with `core/` (data processing, vol surface fitting, density conversion), `data_access/` (readers and vendors), `pipelines/` (probability and surface pipelines) and `interface/` (`probability.py` with `ProbCurve` and `ProbSurface`, `volatility.py`).

## Data Layer
CSV and DataFrame readers plus a yfinance vendor adapter. Cleaning covers dividends, put-call parity, moneyness selection and validation.

## Event Loop
None. Synchronous calls on one options chain.

## Execution
None. Analytics only.

## Risk
Arbitrage checks on the fitted surface: CDF monotonicity severity tests and repair warnings in `rnd.py`.

## Strategies Shipped
None. `vol_surface_fitting/algorithms/` holds SVI, SSVI and B-spline fitters; `probability_density_conversion/rnd.py` turns a price curve into a PDF and CDF.

## AI Components
None.

## Connectors
yfinance, CSV, pandas DataFrame.

## Fit
Reference for turning option quotes into a risk-neutral density and probability of a price level. Useful as a pricing cross-check for event contracts. No trading code.
