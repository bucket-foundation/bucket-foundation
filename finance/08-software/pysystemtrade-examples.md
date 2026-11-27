# pysystemtrade_examples

https://github.com/robcarver17/pysystemtrade_examples. License not stated. Stars 281. Last push 2018-02-21. Python. Checked 2026-11-27.

## Architecture
Folders of blog-post scripts that import pysystemtrade: `breakout`, `fitting`, `forecasting`, `forecastscaling`, `mythbusting`, `optimisation`, `regressionrule`, `riskenvelope`, `riskmanagement`, `smallaccountsize`, `dockertest`.

## Data Layer
pysystemtrade's bundled futures data and YAML configs per example.

## Event Loop
None. Each script builds a system and prints or plots results.

## Execution
None.

## Risk
`riskmanagement/measurement.py` and `parameteruncertainty.py`; `riskenvelope`; `smallaccountsize` studies rounding and diversification with small capital.

## Strategies Shipped
`breakout/breakout.py`, `regressionrule/tradingrule.py`, and forecast studies in `forecasting/` and `mythbusting/ewmacperformance.py`.

## AI Components
None.

## Connectors
None beyond pysystemtrade.

## Fit
Worked experiments for the pysystemtrade design: forecast scaling, weight fitting, cost-aware optimisation.
