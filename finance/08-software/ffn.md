# ffn

https://github.com/pmorissette/ffn. License MIT. Stars 2,702. Last push 2026-11-19. Python. Checked 2026-11-27.

## Architecture
Package `ffn/`: `core.py` (PerformanceStats, GroupStats, drawdown tools, rebasing), `data.py` (`get` for Yahoo, Tiingo), `utils.py`. Underpins the `bt` backtester.

## Data Layer
Pandas price frames from Yahoo and Tiingo.

## Event Loop
None.

## Execution
None.

## Risk
Drawdown series, Calmar, Sortino, monthly returns, risk contribution functions.

## Strategies Shipped
Weighting helpers: inverse volatility, mean-variance, ERC.

## AI Components
None.

## Connectors
Yahoo, Tiingo.

## Fit
Light performance-stats library; companion to `bt`.
