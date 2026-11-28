# portfolio-optimization

https://github.com/NVIDIA-AI-Blueprints/portfolio-optimization. License Apache-2.0. Stars 511. Last push 2026-11-23. Jupyter Notebook, Python. Checked 2026-11-27.

## Architecture
Python modules in `src/`: `base_optimizer`, `mean_variance_optimizer`, `cvar_optimizer` with matching parameter and data classes, `scenario_generation` (`ForwardPathSimulator`), `backtest` (`portfolio_backtester`), `rebalance` (`rebalance_portfolio`), `portfolio`. `demo/` holds a Streamlit app and `notebooks/` the walkthroughs.

## Data Layer
Price history loaded into dataframes. KDE scenario sampling creates return scenarios for CVaR. GPU libraries from the RAPIDS stack are optional.

## Event Loop
None. Rebalance loop steps through dates in a backtest.

## Execution
None. Output is target weights and simulated transaction costs.

## Risk
CVaR optimization over scenarios, mean-variance with an efficient frontier, max drawdown and drift triggers in `rebalance.py`, Sharpe and Sortino reporting.

## Strategies Shipped
Rebalancing strategies in `rebalance_portfolio.re_optimize`: periodic, percent-change, drift-from-optimal and drawdown triggers, compared with equal-weight and buy-and-hold benchmarks.

## AI Components
`skills/` folder and `AGENTS.md` for coding agents. The solver is GPU linear programming (cuOpt) behind `cvxpy`.

## Connectors
None.

## Fit
Reference for scenario-based CVaR allocation with a rebalance backtester. Needs an NVIDIA GPU for the fast path.
