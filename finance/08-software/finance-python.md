# Finance-Python

https://github.com/alpha-miner/Finance-Python. License MIT. Stars 924. Last push 2024-01-01. Python with Cython. Checked 2026-11-27.

## Architecture
Package `PyFin/` in the style of QuantLib. `Analysis/` holds a composable indicator system (`SecurityValueHolders.pyx`, `CrossSectionValueHolders.pyx`, stateful and stateless technical analysers, `transformer.pyx`). `DateUtilities/` has `Calendar`, `Date`, `DayCounter`, `Period` and `Schedule`. `CashFlows/` has fixed-rate coupons and interest rates. `PricingEngines/`, `Math/` (accumulators, distributions, root finders, time series), `POpt/`, `Patterns/` and `Enums/` round it out.

## Data Layer
`Analysis/DataProviders` supplies price frames to indicators. Indicators stream values one bar at a time or evaluate over a whole frame. Cython extensions compile at install.

## Event Loop
None. Indicator objects update on `push` calls from the caller.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
None.

## Fit
Business-day calendars, day counters, coupon schedules and streaming indicators in one package. The code targets older Python and last saw a push in 2024, so check the build on current interpreters before use.
