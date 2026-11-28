# poly_data

https://github.com/warproxxx/poly_data. License GPL-3.0. Stars 2,356. Last push 2026-09-08. Python. Checked 2026-11-27.

## Architecture
`update.py` runs `update_utils/`: update_markets (Gamma API), update_chain (Goldsky order-filled events), process_live (fills to trades), pipeline. Notebook for exploration and a backtrader plotting helper.

## Data Layer
Markets, order events and trades as CSV.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Polymarket Gamma API, Goldsky subgraph.

## Fit
Trade-level Polymarket history for backtests and wallet studies.
