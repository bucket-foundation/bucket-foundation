# riskparity.py

https://github.com/convexfi/riskparity.py. License MIT. Stars 327. Last push 2026-08-31. Python and C++. Checked 2026-11-27.

## Architecture
Package `src/riskparityportfolio/`: `rpp.py` (class `RiskParityPortfolio`), `sca.py` (`SuccessiveConvexOptimizer`), `riskfunctions.py`, and a C++ solver `vanilla.cpp` built on a vendored Eigen 3.3.7.

## Data Layer
Covariance matrix and risk budget vectors passed in as NumPy arrays.

## Event Loop
None.

## Execution
None.

## Risk
Risk budgeting is the product: equal or custom risk contributions, with optional return, volatility and box or line constraints through `project_line_and_box`.

## Strategies Shipped
Vanilla risk parity and a modern formulation solved by successive convex approximation.

## AI Components
None.

## Connectors
None.

## Fit
Portfolio allocator for risk parity weights. Plugs into a rebalancing job after a covariance estimate.
