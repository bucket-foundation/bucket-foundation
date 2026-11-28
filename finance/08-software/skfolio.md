# skfolio

https://github.com/skfolio/skfolio. License BSD-3-Clause. Stars 2,678. Last push 2026-11-27. Python. Checked 2026-11-27.

## Architecture
scikit-learn style package `src/skfolio/`: `optimization` (mean-risk, risk parity, HRP, HERC, NCO, Black-Litterman, factor models), `prior`, `moments`, `uncertainty_set`, `model_selection` (walk-forward, combinatorial purged CV), `portfolio`, `measures`, `pre_selection`.

## Data Layer
Pandas and numpy inputs; sample datasets.

## Event Loop
None.

## Execution
None.

## Risk
Many risk measures: CVaR, drawdown, semi-variance, EVaR, plus stress and factor tools.

## Strategies Shipped
Estimators follow `fit` and `predict`, enabling grid search across allocation models.

## AI Components
None.

## Connectors
None.

## Fit
Best-in-class open allocation library with proper cross-validation. Pair with a Nautilus-style engine.
