# xalpha

https://github.com/refraction-ray/xalpha. License MIT. Stars 2,756. Last push 2026-11-14. Python. Checked 2026-11-27.

## Architecture
Package `xalpha/`: `info.py` (fund and index info), `trade.py` and `multiple.py` (cash-flow records), `evaluate.py` (XIRR, comparison), `policy.py` (investment policies), `backtest.py`, `indicator.py`, `realtime.py`.

## Data Layer
Chinese fund NAVs from Tiantian, Eastmoney and Yahoo.

## Event Loop
None.

## Execution
Simulated trades from policy objects.

## Risk
None.

## Strategies Shipped
`policy.py` schedules: fixed periodic buy, buy-on-dip scale-in, value averaging.

## AI Components
None.

## Connectors
Chinese fund data sources.

## Fit
Fund portfolio tracker and policy backtester for Chinese mutual funds.
