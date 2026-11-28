# KalshiMarketMaker

https://github.com/rodlaf/KalshiMarketMaker. License MIT. Stars 470. Last push 2026-04-14. Python. Checked 2026-11-27.

## Architecture
`core/avellaneda.py` (quoting model), `core/kalshi_api.py`, `selection/scoring.py` (market picker), `runtime/` (workers per market, dynamic config, cleanup), CLI for run, cancel-all and dashboard. Deploys to Fly.io.

## Data Layer
Kalshi REST order books polled per worker.

## Event Loop
One worker thread per market loops every `dt` seconds.

## Execution
Two-sided limit quotes, cancel and replace.

## Risk
Max position per market, global remaining capacity shared across workers, pending-exposure accounting, inventory-dependent gamma.

## Strategies Shipped
Avellaneda-Stoikov market making: reservation price shifted by inventory, optimal spread from gamma, sigma and time to close, asymmetric quotes.

## AI Components
None.

## Connectors
Kalshi.

## Fit
Small, readable Avellaneda-Stoikov reference for binary contracts.
