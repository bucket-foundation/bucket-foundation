# pysystemtrade

https://github.com/robcarver17/pysystemtrade (now pst-group/pysystemtrade). License GPL-3.0. Stars 3,645. Last push 2026-11-02. Python. Checked 2026-11-27.

## Architecture
Rob Carver's production futures system. A backtest `System` is a chain of stages in `systems/`: rawdata, rules, forecast scaling and capping, forecast combination, position sizing, portfolio, accounts. Production code splits into `sysdata` (Arctic/Parquet and MongoDB stores), `sysexecution` (order stacks), `sysbrokers` (IBKR), `syscontrol` (scheduled processes) and a dashboard.

## Data Layer
Futures contract prices, adjusted (back-adjusted) series, multiple-price series for carry, FX, roll calendars, spread costs. Parquet and MongoDB backends.

## Event Loop
Backtest: vectorized pandas. Production: `syscontrol` runs daily processes (price updates, strategy runs, order stack handling, reports) on a schedule.

## Execution
Three order stacks: instrument, contract, broker. Algos in `sysexecution/algos/`: market, limit, snap, adaptive, and `algo_original_best` (passive limit that turns aggressive on adverse move or timeout).

## Risk
`systems/risk_overlay.py` scales positions down when portfolio risk, correlation shock or leverage exceeds limits. Volatility targeting in position sizing. Position buffering cuts turnover.

## Strategies Shipped
`systems/provided/rules/`: ewmac, breakout, carry and relative carry, accel, mr_wings, relative momentum, cross-sectional mean reversion, factor rules. Execution strategies: classic buffered positions, dynamic optimised positions.

## AI Components
None.

## Connectors
IBKR through ib_async.

## Fit
Best open reference for a diversified trend and carry futures sleeve with vol targeting and a risk overlay. Port the rule set and sizing; keep the order path as alerts.
