<!-- voice-ignore-file: transcript-derived digest -->
# How quant trading strategies are developed and tested w/ Ernie Chan | Chat With Traders | DW9zQ8Hz6gQ | 1.01 h

Teaches: Ernest Chan describes how his fund runs several intraday, non-high-frequency strategies per market, how it sizes and monitors them, and how to treat backtests and published research as inspiration that needs modification and cost modeling.

Claims:
- Almost every model he built early on looked good in backtest and failed live; the main obstacle is that financial data is sparse compared with other machine learning datasets, so models must be constrained. "compared to other sort of machine learning" [0:10:32]
- The fund trades intraday but not high frequency, because the holding period gives enough trades to show results are not luck, without needing high frequency infrastructure. "the intraday trading but not high frequency" [0:11:43]
- He runs seven or eight strategies at once for diversification, with a separate model for every futures instrument, and market-neutral long/short construction for stocks. "single instrument we have a separate model" [0:14:26]
- No model has been found that predicts next month's momentum or mean-reversion regime; the answer is to run both and let losses of one be smaller than gains of the other. "be able to predict the next month" [0:19:46]
- Ideas from papers and books are inspiration, not recipes; copying a published strategy as written often fails, so every idea needs own modification and testing. "paper so ideas we generate greeting card" [0:34:42]
- Backtests need bid/ask and top-of-book size data to estimate execution price; strategies that look good on paper can break when 10,000 shares must be executed instead of 100. "you intend to execute 10 000 shares" [0:44:53]

Architecture: Portfolio of 7 or 8 separate intraday strategies across FX, futures, stocks and options, one model per futures instrument. Stocks use a market-neutral daily selection model. Allocation across strategies has a discretionary layer; new strategies start at low leverage and scale up. Overrides exist for rare events such as natural disasters. No data pipeline detail beyond tick data with spreads and top-of-book size for cost modeling.

Worked:
- Two strategies worked from day one and have been the backbone of the fund for more than four years. "more than four years and the backbone" [0:21:55]
- Running multiple uncorrelated strategies kept monthly drawdowns small. "are not able to compete every month" [0:20:49]
- Adding a minimum volatility filter or shorter lookback fixed a Japan strategy that lost when volatility rose. "you might be running again in japan" [0:37:56]

Failed:
- Chan says models that worked on a backtest basis often failed in live trading, which he calls a big challenge. "on you know back test basis but fail" [0:09:51]
- Two strategies started weak and needed leverage cuts. "there are two strategies that we started" [0:22:02]
- Academic ideas often fail from overfitting or ignored transaction costs. "have not taken into account transaction costs" [0:33:36]
- Fund started with only one strategy and a risky portfolio and had to lower leverage a lot. "we have lowered our leverage a lot" [0:19:00]
- Data snooping bias: complicated models fit history with no predictive power. "a big boy these data snooping bias" [0:40:06]
