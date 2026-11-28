# time-series-forecasting-pytorch

https://github.com/jinglescode/time-series-forecasting-pytorch. License Apache License 2.0. Stars 332. Last push 2024-04-21. Jupyter Notebook. Checked 2026-11-27.

## Architecture
Notebook `demo-predicting-stock-prices.ipynb` plus `project.py` and `step_by_step_code_blocks/` (configs, data download, normalization, dataloader, `LSTMModel`, training, evaluation, future prediction).

## Data Layer
Alpha Vantage adjusted close fetched by key, windowed to 20 days and normalized.

## Event Loop
None. Train and evaluate loop.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. A next-day price predictor.

## AI Components
PyTorch LSTM: linear layer, ReLU, LSTM stack, dropout, output layer.

## Connectors
Alpha Vantage.

## Fit
Teaching baseline for LSTM price forecasts. Reports price error, with no backtest of returns.
