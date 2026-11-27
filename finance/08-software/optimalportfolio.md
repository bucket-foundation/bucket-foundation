# OptimalPortfolio

https://github.com/VivekPa/OptimalPortfolio. License MIT. Stars 375. Last push 2024-02-27. Python. Checked 2026-11-27.

## Architecture
Package `PortOpt/`: `moment_est.py` (`ExpReturns`, `RiskModel`, `Shrinkage`, `MLE`), `invariants.py`, `distributions.py`, `exp_max.py`, `base_opt.py` (`ConvexOptimiser`), `opt_allocations.py` (`Optimiser`), `cvx_functions.py`, `utility_functions.py`. Reference papers on Ledoit-Wolf shrinkage live in `references/`. Tests in `tests/`.

## Data Layer
Takes a pandas price or returns frame. No storage.

## Event Loop
None.

## Execution
None. Outputs target weights.

## Risk
Covariance shrinkage (constant correlation, single factor) and utility-based optimization with convex constraints through cvxpy.

## Strategies Shipped
None. Allocation methods only.

## AI Components
Expectation maximization for fitting distributions; no learned models.

## Connectors
None.

## Fit
Portfolio construction component with shrinkage covariance. Weights feed any executor. Version 0.0.3 on a build tree committed to the repo.
Expected returns come from historical mean or shrinkage estimates; the risk model accepts sample covariance or the Ledoit-Wolf variants documented in the reference papers.
