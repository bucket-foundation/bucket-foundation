# qsx-strategy-score

https://github.com/jianweiweng05/qsx-strategy-score. License MIT. Stars 930. Last push 2026-10-25. Python. Checked 2026-11-27.

## Architecture
Package `qsx_strategy_score/` with a CLI (`cli.py`), a Streamlit app (`app/streamlit_app.py`) and a Chrome extension (`chrome-extension/`). Core modules: `io.py` (load returns, equity curves or trade lists), `metrics.py`, `scoring.py`, `triage.py`, `coaching.py`, `profiles.py`, `report.py`, `report_preflight.py`, `i18n.py` and `overlay_client.py`.

## Data Layer
Reads CSV return series, equity curves and trade files from the user. No market data feed and no database.

## Event Loop
None. A single pass over the input series.

## Execution
None.

## Risk
Scores risk of a backtest. `metrics.py` computes CAGR, Sharpe with standard error, Sortino, Calmar, max drawdown, CVaR, profit factor, win rate, autocorrelation, probabilistic Sharpe, deflated Sharpe for a trial count and a trial budget. `triage.py` adds edge persistence, evidence confidence, trade dependency and drop-top-k-trades checks.

## Strategies Shipped
None.

## AI Components
None. `coaching.py` writes rule-based advice text from the metrics.

## Connectors
`overlay_client.py` posts normalized returns to the author's hosted crypto overlay preview; the open-source scorer does not ship that series.

## Fit
Quick overfitting and luck check for any return series before capital goes in. Deflated Sharpe and probabilistic Sharpe follow Bailey and Lopez de Prado. The hosted overlay is a product funnel and can be left unused.
