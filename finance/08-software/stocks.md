# Stocks

https://github.com/NGYB/Stocks. License Apache-2.0. Stars 380. Last push 2026-07-10. Jupyter notebooks and Python. Checked 2026-11-27.

## Architecture
Three groups: `StockPricePrediction/` and `StockPricePrediction_fh21/` (versioned notebooks comparing last value, moving average, linear regression, XGBoost, LSTM, Prophet and exponential smoothing), `StockDirectionPrediction_AutoGen/` (two scripts) and `StockDirectionPrediction_CrewAI/` (notebook and `utils.py`).

## Data Layer
Yahoo-style price CSVs and saved Prophet tuning pickles under `data/`. The agent scripts read per-company CSV files.

## Event Loop
None. Notebooks and scripts run once.

## Execution
None.

## Risk
Error metrics on forecasts only.

## Strategies Shipped
None. Forecast baselines are compared on price error.

## AI Components
AutoGen group chat and nested chat with a data aggregation agent and a report agent using an OpenAI model on CSV data. A CrewAI crew does the same for stock direction.

## Connectors
OpenAI API.

## Fit
Baseline forecasting comparisons and a template for multi-agent stock reports. No trading path.
