# Q-Fin

https://github.com/romanmichaelpaolucci/Q-Fin. License MIT. Stars 683. Last Push 2023-10-31. Python. Checked 2026-11-27.

## Architecture
Small library in `QFin/` with three modules: `options.py`, `simulations.py` and `stochastics.py`. Plain classes take parameters in constructors and expose methods for price, Greeks and path simulation. The `QFin` package folder carries the source; the lowercase `qfin` folder holds only compiled bytecode. Build and dist folders are committed.

## Data Layer
None. Inputs are numeric parameters.

## Event Loop
None. Pure computation with numpy arrays.

## Execution
None.

## Risk
`simulations.py` also prices binary calls and puts by Monte Carlo. Option Greeks (delta, gamma, vega, theta) from `BlackScholesCall` and `BlackScholesPut`.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
None.

## Fit
Teaching-level pricing code: Black-Scholes, Monte Carlo under geometric Brownian motion and a stochastic variance model, arithmetic Brownian motion with calibration. Not production grade, and a pricing library such as Quantsbin or QuantLib covers the same ground with more breadth.
