# pynance

https://github.com/GriffinAustin/pynance. License MIT. Stars 489. Last push 2021-02-03. Python. Checked 2026-11-27.

## Architecture
Package `pynance/`: `data/` (`retrieve`, `prep`, `feat`, `compare`, `combine`, `lab`), `tech/` (`simple`, `movave`), `learn/` (`linreg`, `metrics`), `pf.py`, `interest.py`, `chart.py`, `dateutils.py`, `tst/` with unit and integration tests.

## Data Layer
`retrieve.get` pulls equity history through pandas-datareader; `equities` reads exchange symbol lists over FTP. Pandas frames throughout.

## Event Loop
None.

## Execution
None.

## Risk
Return and growth statistics, volatility helpers, `pf.optimize` for portfolio weights from expected returns and covariances.

## Strategies Shipped
None.

## AI Components
Feature and label builders for machine learning plus linear regression in `learn/`.

## Connectors
Yahoo-style data through pandas-datareader, which has since broken for several sources.

## Fit
Historical teaching library. Unmaintained since 2021, so use it only as a pattern reference.
