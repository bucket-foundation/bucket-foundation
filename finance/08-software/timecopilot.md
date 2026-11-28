# TimeCopilot

https://github.com/TimeCopilot/timecopilot. License MIT. Stars 643. Last push 2026-11-18. Python. Checked 2026-11-27.

## Architecture
`timecopilot/forecaster.py` runs model families (`models/stats.py`, `ml.py`, `neural.py`, `prophet.py`, foundation models); `agent.py` wraps them in an LLM agent that picks models and explains results; `_cli.py` command line.

## Data Layer
Pandas long-format time series.

## Event Loop
Batch cross-validation.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
LLM agent selects and explains forecasts over foundation models.

## Connectors
None.

## Fit
Forecast comparison tool for price and volume series; no trading.
