# Pairs-Trading-With-Python

https://github.com/KidQuant/Pairs-Trading-With-Python. License none stated. Stars 858. Last push 2024-04-01. Jupyter Notebook. Checked 2026-11-27.

## Architecture
One notebook, `PairsTrading.ipynb`, plus `requirements.txt`. Cells build synthetic series, test stationarity and cointegration, scan a stock list, then trade a ratio signal.

## Data Layer
Yahoo Finance daily closes through `pandas_datareader` and `yfinance` for 11 tickers (AAPL, ADBE, ORCL, EBAY, MSFT, QCOM, HPQ, JNPR, AMD, IBM, SPY), 2013 to 2019. Held in memory.

## Event Loop
None. Vectorized pandas over a train and test split at 70/30.

## Execution
None. The `trade` function walks the ratio series and tracks positions in a loop for a score.

## Risk
None. It checks window lengths on train and test data to expose overfit.

## Strategies Shipped
Cointegration pairs trade on the ADBE to MSFT price ratio using a z-score of the 5-day mean against the 60-day mean and standard deviation. Long ratio below -1, short above 1.

## AI Components
None.

## Connectors
Yahoo Finance.

## Fit
Short tutorial for the statistics of pairs trading: `adfuller`, `coint`, OLS hedge ratio. Not a backtester; costs and slippage are absent.
