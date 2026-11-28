# Riskfolio-Lib

https://github.com/dcajasn/Riskfolio-Lib. License BSD-3-Clause. Stars 4,626. Last push 2026-11-04. Python with C++ extensions. Checked 2026-11-27.

## Architecture
`riskfolio/src/Portfolio.py` builds convex optimization problems in CVXPY; `HCPortfolio.py` does hierarchical methods; `RiskFunctions.py`, `ParamsEstimation.py`, `ConstraintsFunctions.py`, `Reports.py`, `PlotFunctions.py` support them.

## Data Layer
Return frames passed in. Estimators for mean, covariance (shrinkage, EWMA, Gerber statistic, denoised), Black-Litterman and factor models.

## Event Loop
None.

## Execution
None.

## Risk
24 risk measures: variance, MAD, CVaR, EVaR, RLVaR, CDaR, max drawdown, ulcer index, worst realization and others. Risk budgeting and risk parity on any of them.

## Strategies Shipped
None as trading rules. Portfolio models: mean-risk, risk parity, HRP, HERC, NCO, Black-Litterman, worst-case robust.

## AI Components
None.

## Connectors
None.

## Fit
Monthly allocation step: turn sleeve return series into weights under a drawdown-based risk measure.
