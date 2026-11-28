# Quantsbin

https://github.com/JasGujral/Quantsbin. License MIT. Stars 664. Last Push 2026-11-18. Python. Checked 2026-11-27.

## Architecture
Package `quantsbin/` with `derivativepricing` (`instruments.py`, `pricingmodels.py`, `numericalgreeks.py`, `optionstrategies.py`, `engineconfig.py`, `plotting.py`) and `montecarlo` (`stimulations.py`). Instrument classes (`EqOption`, `FutOption`, `FXOption`, `ComOption`) hand off to an `Engine` that selects a pricing model.

## Data Layer
None. Market parameters are passed in as arguments and valuation dates as `YYYYMMDD` strings. Enumerations in `namesnmapper.py` name asset classes, pricing models, expiry types and dividend types.

## Event Loop
None. Pure computation.

## Execution
None.

## Risk
Analytic and numerical Greeks per option and per multi-leg portfolio, through `risk_parameters` on `Engine` and `NumericalGreeks`. Payoff plots by spot.

## Strategies Shipped
`StdStrategies` prices 17 named option structures: bull and bear call and put spreads, box spread, butterflies, calendars, straddles, strangles, strip and strap.

## AI Components
None.

## Connectors
None.

## Fit
Compact option pricer covering Black-Scholes-Merton, Black-76, Garman-Kohlhagen, binomial trees and Monte Carlo under geometric Brownian motion. Useful as a cross-check for a larger library; no data or broker access.
