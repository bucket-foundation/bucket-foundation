# finagg

https://github.com/theOGognf/finagg. License Apache-2.0. Stars 550. Last push 2026-03-22. Python. Checked 2026-11-27.

## Architecture
Package `src/finagg/` with one subpackage per source: `bea`, `fred`, `sec`. Each has `api` clients, `sql.py` storage, `feat/` feature builders and a `_cli.py`. `__main__.py` wires the `finagg` command; `ratelimit.py` and `config.py` are shared.

## Data Layer
BEA, FRED and SEC EDGAR APIs aggregated into SQL tables via SQLAlchemy. `sec/sql.py` maps tickers to CIKs and industries. Feature classes: `sec` `Annual`, `NormalizedAnnual`, `IndustryAnnual` and quarterly; `fred` `Economic`.

## Event Loop
None. Batch install and update commands.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None. Features are shaped for model training by the user.

## Connectors
BEA, FRED, SEC EDGAR. Rate limiter per API.

## Fit
Useful fundamentals and macro feature store for research. Pairs with a backtester for factor work.
