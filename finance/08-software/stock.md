# stock

https://github.com/myhhub/stock. License Apache-2.0. Stars 15,401. Last push 2026-04-02. Python. Checked 2026-11-27.

## Architecture
Scheduled batch app under `instock/`: `job/` daily jobs (`execute_daily_job.py` runs basic data, indicators, K-line patterns, strategies, backtest rates), `core/` (crawling, indicator, pattern, strategy, backtest), `web/` Tornado dashboard, `trade/` robot. Docker and supervisor files ship with it.

## Data Layer
Eastmoney crawlers in `core/crawling/` (history, dragon-tiger list, block trades, fund flow) write to MySQL through SQLAlchemy and PyMySQL. `tablestructure.py` defines the schema. Singleton proxies cache trade dates and stock lists.

## Event Loop
Cron-driven daily batch for research. The trade robot has its own `event_engine.py` and `clock_engine.py` that fire strategy handlers at set clock times.

## Execution
`trade/trade_service.py` drives A-share brokers through `easytrader`. `stratey1.py` registers a clock event at 14:54:30. Selection output is a table; orders need a hand-written strategy.

## Risk
None.

## Strategies Shipped
Ten screens in `core/strategy/`: turtle breakout, MA250 pullback, platform breakout, high tight flag, parking apron, climax limit-down, low ATR, keep increasing, low-backtrace increase, plus `enter.py` volume rise. `rate_stats.py` measures forward returns of each screen.

## AI Components
None.

## Connectors
Eastmoney, easytrader, TA-Lib.

## Fit
Reference for A-share daily screening with pattern recognition and forward-return stats. The execution path is thin and unguarded.
