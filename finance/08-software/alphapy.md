# AlphaPy

https://github.com/ScottfreeLLC/AlphaPy. License Apache-2.0. Stars 1,791. Last push 2026-10-05. Python. Checked 2026-11-27.

## Architecture
Single package `alphapy/`. `model.py` and `features.py` build scikit-learn, xgboost, LightGBM and Keras pipelines from YAML config. `market_flow.py` turns the pipeline into a market model, `sport_flow.py` into a sports model, `system.py` and `portfolio.py` run trading systems.

## Data Layer
Pandas frames from Google, Yahoo, Quandl and IEX pulls in `data.py`; `fxmacrodata.py` adds FX macro series.

## Event Loop
Batch pipeline: load, engineer features, train, predict, backtest.

## Execution
No order routing. Systems in `system.py` emit long and short signals evaluated by `portfolio.py`.

## Risk
Portfolio position sizing and pyfolio statistics.

## Strategies Shipped
`system.py` holds rule-based systems (for example moving-average crossover and breakout) used in MarketFlow.

## AI Components
Classical ML ensembles, stacking and blending; no LLM.

## Connectors
Data vendors only.

## Fit
Useful pattern for config-driven ML pipelines on market and sports data. The maintainers moved development to a paid Pro edition.
