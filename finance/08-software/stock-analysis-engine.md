# stock-analysis-engine

https://github.com/AlgoTraders/stock-analysis-engine. License Apache-2.0 (LICENSE file; the GitHub metadata field is blank). Stars 1,248. Last push 2020-09-05. Jupyter Notebook, Python. Checked 2026-11-27.

## Architecture
Package `analysis_engine/`: `algo.py` (`BaseAlgo`), `algo_runner.py`, `run_algo.py`, `run_custom_algo.py`, `indicators/`, `ai/`, `iex/`, `finviz/`, `scripts/`, plus dataset builders. Deployment assets: `compose/`, `docker/`, `k8/` and `helm/`. Celery workers collect and process data.

## Data Layer
Redis caches minute and daily datasets; S3 holds archives and history. Sources are IEX Cloud and Finviz. Datasets are extracted, scrubbed and loaded back from Redis, S3 or files.

## Event Loop
Celery tasks for collection; the algorithm iterates dataset rows by date through `process`, calling indicator processors on each row.

## Execution
Simulated. `build_buy_order.py` and `build_sell_order.py` record trades with commission, plus call and put spread entry and exit builders. `BaseAlgo` tracks balance, positions and a trade history dataset.

## Risk
`stop_loss` and `trailing_stop_loss` attributes, `min_buy_indicators` and `min_sell_indicators` voting thresholds, and a balance limit.

## Strategies Shipped
Indicator-driven algorithms configured from `cfg/default_algo.json`: buy and sell rules over 25 indicator modules (ADX, ATR, Bollinger Bands, EMA, MACD, MFI, RSI, stochastics, Williams %R and others).

## AI Components
`ai/build_regression_dnn.py` builds a Keras regression network on scaled datasets; TensorFlow and Keras are in `setup.py`.

## Connectors
IEX Cloud, Finviz, Redis, S3, Slack, Jupyter.

## Fit
Large backtest and dataset pipeline with a kube deployment. Dormant since 2020, and IEX Cloud has changed its API, so the data layer needs rework.
