<!-- voice-ignore-file: transcript-derived digest -->
# Backtesting.py - Full course in python | Chad Thackray | e4ytbIm2Xg0 | 1.16 h

Teaches: A tutorial on the Backtesting.py library: writing a Strategy with indicators, running and plotting a backtest, parameter optimization with constraints and custom metrics, multi-timeframe logic, shorting, stops, sizing and trade extraction.

Claims:
- Backtesting.py is a lightweight event-driven backtester with a small API, a built-in optimizer and an interactive browser plot; it has no multi-asset support in the stock version and no fractional shares. "to plot nice heat maps backtesting py" [0:01:48]
- Indicators are computed on the close and orders fill at the next bar's open. "calculates the indicators based on the close" [0:06:31]
- A random search with max_tries is faster and lowers overfitting compared with a full grid search. "you're overfitting because it's it's it's randomly" [0:31:51]
- Stop loss and take profit are set at order time, but are not triggered intrabar on daily data. "won't trigger the stop loss like intra" [0:56:42]
- resample_apply builds higher timeframe indicators such as a weekly RSI inside a daily strategy. "going to be equal to resample apply" [0:43:39]

Architecture: A single-asset RSI crossover strategy on bundled Google price data, $10,000 start: Strategy class with init for indicators and next for per-bar rules; optimize across upper bound, lower bound and RSI window; plots and trade log extracted as a pandas DataFrame. No execution or live risk system.

Worked:
- A backtest ran in about a second; the optimizer found a Sharpe ratio of about 0.59 across 490 combinations. "these you can pick the sharp ratio" [0:18:15]
- Requiring at least 10 trades in the custom metric produced more sensible parameters (17 trades). "making here so it made 17 trades" [0:26:19]
- Stop loss at 5% kept losses near that level on daily bars. "really lose more than 5% on any" [0:57:11]

Failed:
- The basic RSI strategy lagged buy and hold with large drawdowns, a roughly 50% retracement in 2008 to 2009 and a drawdown lasting from 2008 to about 2012. "a 50% retracement during the 2008 2009" [0:15:27]
- Unconstrained optimization picked a massively overfit result (upper bound 30, lower 25, tiny trades). "30 and a lower bound of 25" [0:21:46]
- A custom metric of equity over exposure time chose one swing trade with 2.7% exposure. "the market 2 7% of the time" [0:24:09]
- A reversal short strategy lost about 80% of equity until position checks were added; logic bugs made it trade nothing or repeat trades. "and we've lost 80% of our equity" [0:50:40]
- Stop loss and rebuy immediately can churn. "loss triggers but it buys again immediately" [0:57:22]
