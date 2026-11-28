# quantdsl

https://github.com/johnbywater/quantdsl. License BSD 3-Clause (LICENSE file). Stars 386. Last push 2018-04-14. Python. Checked 2026-11-27.

## Architecture
`quantdsl/semantics.py` defines the DSL (arithmetic, `Max`, `Min`, `If`, `Market`, `Settlement`, `Fixing`, `Wait`, `Choice`) and a `LongstaffSchwartz` regression for early exercise. `domain/model` holds contract specification, valuation, market simulation and call dependencies. `application/` offers single, multithreaded and Python-object variants. `priceprocess/blackscholes.py` simulates prices.

## Data Layer
Historical price series calibrate volatility and correlation (`generate_calibration_params`). Event-sourced persistence policy for call results.

## Event Loop
Dependency graph of function calls evaluated in parallel by a worker pool; subscribers react to graph and simulation events.

## Execution
None.

## Risk
Perturbation dependencies for bump-and-revalue greeks.

## Strategies Shipped
None. Example notebook values energy-style contracts such as gas storage and swing options.

## AI Components
None. Regression for Longstaff-Schwartz only.

## Connectors
None.

## Fit
Contract-as-code valuation by Monte Carlo with American features. Last push 2018; a research artifact.
