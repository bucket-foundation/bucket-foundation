# Financial Models Numerical Methods

https://github.com/cantaro86/Financial-Models-Numerical-Methods · AGPL-3.0 · 7,556 stars · last push 2026-10-05 · Jupyter and Python · checked 2026-11-27

## Architecture
Course notebooks (1.1 to 7.1, A.1 to A.3) backed by the `FMNM` package in `src/FMNM/` and C solvers in `src/C/`.

## Data Layer
Small CSVs in `data/` for calibration and Kalman examples. No vendor feed.

## Event Loop
None.

## Execution
None.

## Risk
`src/FMNM/portfolio_optimization.py`: classical mean-variance optimization. `src/FMNM/TC_pricer.py`: option pricing with transaction costs (Davis, Panas, Zariphopoulou utility indifference).

## Strategies Shipped
No trading strategies. Models with direct strategy use:
- `src/FMNM/Kalman_filter.py`: Kalman regression for a time-varying beta, the core of dynamic hedge ratio pairs trading (notebook 5.1).
- Notebook `6.1 Ornstein-Uhlenbeck process and applications.ipynb`: OU fit and a mean-reversion trading rule on the spread.
- Notebook `5.3 Volatility tracking.ipynb`: Kalman and GARCH volatility estimates.
- Pricers: `BS_pricer.py`, `Heston_pricer.py`, `Merton_pricer.py`, `VG_pricer.py`, `NIG_pricer.py`, with Monte Carlo, PDE, Fourier (`FFT.py`, `CF.py`) and American option solvers (`Solvers.py`).

## AI Components
None.

## Connectors
None.

## Fit
Study material for options pricing and mean-reversion math. Lift the Kalman hedge-ratio and OU code into the stat-arb research module.
