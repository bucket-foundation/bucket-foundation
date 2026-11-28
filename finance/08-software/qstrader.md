# QSTrader

https://github.com/mhallsmoore/qstrader. License MIT. Stars 3,491. Last push 2024-06-30. Python. Checked 2026-11-27.

## Architecture
Schedule-driven portfolio backtester from QuantStart. `alpha_model` produces signals, `risk_model` adjusts them, `portcon` (optimiser plus order sizer) builds target weights, `execution` sends orders to a `simulated_broker` and `simulated_exchange`.

## Data Layer
Daily bar CSVs (`daily_bar_csv.py`), static or dynamic universes.

## Event Loop
`simulation/sim_engine.py` emits business-day events; rebalance schedules: buy and hold, daily, weekly, end of month.

## Execution
Market orders at the simulated exchange; percent and zero fee models.

## Risk
Risk model hook (empty base). Dollar-weighted and long-short order sizers.

## Strategies Shipped
`examples/`: buy_and_hold, sixty_forty, sixty_forty_fees, momentum_taa, long_short. Signals: momentum, SMA, vol.

## AI Components
None.

## Connectors
None.

## Fit
Clean reference for the alpha, risk, portfolio construction, execution split. Stale since 2024.
