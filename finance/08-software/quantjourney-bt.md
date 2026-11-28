# QuantJourney Backtester

https://github.com/QuantJourneyOrg/quantjourney-bt. License Apache-2.0. Stars 723. Last push 2026-11-04. Python. Checked 2026-11-27.

## Architecture
Package `backtester/` with `core.py` driving a signal to order to fill to NAV chain. Submodules: `execution` (`fill_engine.py`, `slippage.py`, `commission.py`, `order_types.py`, `simulator.py`), `portfolio` (`book.py`, accounting), `engines` (`blotter.py`, `performance.py`, `benchmark.py`), `metrics`, `plots`. `strategy.py` and `strategies/` hold user strategies.

## Data Layer
Local parquet and yfinance downloads (`local_data.py`, `qj_data.py`); optional QuantJourney cloud API client.

## Event Loop
Bar-by-bar loop over a date index; NAV rebuilt from positions and cash.

## Execution
Simulated fills with configurable slippage, commission and contract specs. No live path.

## Risk
Cost and slippage models, crisis-period reports, walk-forward validation, optimizer hooks.

## Strategies Shipped
Sample strategies in `strategies/` run through `strategy_runner.py`; targets are weights or explicit orders.

## AI Components
A `skills/` folder for coding agents; an observations module pulls sentiment (`adanos.py`).

## Connectors
Data only: yfinance, QuantJourney API.

## Fit
Compact event-light backtester with explicit execution assumptions and audit output. Research only.
