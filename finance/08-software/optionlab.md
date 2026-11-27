# optionlab

https://github.com/rgaveiga/optionlab. License GPL-3.0. Stars 593. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Single package `optionlab/`. `engine.py` exposes `run_strategy(inputs)` and builds profit arrays; `models.py` holds Pydantic types (`Stock`, `Option`, `ClosedPosition`, `Inputs`, `Outputs`); `black_scholes.py` prices and computes Greeks; `mc.py`, `profit.py`, `plot.py`, `option_chain.py`.

## Data Layer
Caller supplies leg definitions and a price array. Optional array inputs let a user pass Monte Carlo terminal prices. No market data fetcher.

## Event Loop
None. One call computes a strategy payoff.

## Execution
None. Output is analytics only.

## Risk
Per-strategy outputs: probability of profit, max loss and max profit, profit and loss ranges, expected profit and loss, delta, gamma, theta, vega, implied vol, probability of touch.

## Strategies Shipped
None as code. Multi-leg option positions are built from `Option` and `Stock` objects by the user. `examples/` holds a Black-Scholes notebook.

## AI Components
None.

## Connectors
None.

## Fit
Clean pricing and payoff calculator for option structures. Use it to evaluate legs before routing them elsewhere. GPL applies to anything linked.
