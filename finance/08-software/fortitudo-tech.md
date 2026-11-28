# fortitudo.tech

https://github.com/fortitudo-tech/fortitudo.tech. License GNU General Public License v3.0. Stars 315. Last push 2026-10-08. Python. Checked 2026-11-27.

## Architecture
Package `fortitudo/tech/`: `entropy_pooling.py`, `optimization.py`, `functions.py` (moments, VaR, CVaR, exposure stacking), `option_pricing.py` (forward, Black call and put), `simulation.py` (exponential decay probabilities), `data.py` loaders. Sixteen notebooks in `examples/`.

## Data Layer
Scenario matrices with probability vectors; sample data files for P&L, risk factors and time series.

## Event Loop
None.

## Execution
None.

## Risk
`portfolio_cvar`, `portfolio_var`, `portfolio_vol`, Mean-CVaR and mean-variance optimization, stress views through entropy pooling.

## Strategies Shipped
None. Optimizers and views, with notebooks for multi-period entropy pooling and conditional maximum loss.

## AI Components
None.

## Connectors
None.

## Fit
Source for turning analyst views into scenario probabilities and optimizing CVaR. Applies to portfolio sizing across correlated event contracts.
