# stock

https://github.com/Rockyzsu/stock. License BSD-3-Clause. Stars 9,152. Last push 2026-04-17. Python. Checked 2026-11-27.

## Architecture
Folder of independent scripts: `datahub/` scrapers, `analysis/`, `backtest/`, `monitor/`, `fund/`, `futu/`, `hk_stock/`, `k-line/`, `machine_learning/`, `ptrade/`, `juejin/`, plus top-level tools such as `select_stock.py`, `longhuban.py`, `jisilu_daily.py`, `strategy_verify.py`.

## Data Layer
Scrapes Jisilu convertible bonds, Eastmoney, Xueqiu, Cninfo and Tencent; stores to MySQL or MongoDB through helpers in `common/` and `store_data.py`.

## Event Loop
Scripts and polling loops. `monitor/` watches big trades and limit-up breaks and plays an alert sound.

## Execution
`futu/` shows Futu OpenD usage for quotes and subscriptions; `ptrade/` and `juejin/` hold strategy code for those broker platforms. No unified adapter.

## Risk
None.

## Strategies Shipped
`backtest/ma_line_backtest.py` uses backtrader on a moving-average line; `new_stock_break.py` tracks new-listing limit breaks; Jisilu bond scripts rank convertible bonds.

## AI Components
`machine_learning/` has scikit-learn experiments.

## Connectors
Futu OpenD, backtrader, Jisilu, Xueqiu, Eastmoney.

## Fit
Tutorial-grade collection for A-share and convertible-bond research. Useful as a list of Chinese data sources.
