# PyPortfolioOpt

https://github.com/robertmartin8/PyPortfolioOpt (now PyPortfolio/PyPortfolioOpt). License MIT. Stars 6,186. Last push 2026-07-07. Python. Checked 2026-11-27.

## Architecture
`pypfopt/`: `expected_returns`, `risk_models` (sample, Ledoit-Wolf, exponential), `efficient_frontier` (mean-variance, semivariance, CVaR, CDaR), `black_litterman`, `hierarchical_portfolio` (HRP), `cla`, `discrete_allocation`.

## Data Layer
Price frames passed in.

## Event Loop
None.

## Execution
`DiscreteAllocation` turns weights into share counts for a cash amount.

## Risk
Covariance shrinkage, L2 regularization, sector constraints.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
None.

## Fit
Smaller and simpler than Riskfolio-Lib. Use it when mean-variance or HRP is enough and a share-count output is wanted.
