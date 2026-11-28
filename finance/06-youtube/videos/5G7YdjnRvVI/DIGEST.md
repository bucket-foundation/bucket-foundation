<!-- voice-ignore-file: transcript-derived digest -->
# Mean Reversion Trading Explained by Dr. Ernest Chan - Take Control of Your Trades! | QuantInsti Quantitative Learning | 5G7YdjnRvVI | 1.07 h

Teaches: Dr. Ernest Chan explains statistical arbitrage, stationarity, the ADF test, cointegration versus correlation, and basic Bollinger band mean reversion. The second half is a course promotion and audience Q&A.

Claims:
- A price series is stationary if it does not wander off. "reverting and now if a price series" [0:10:34]
- The ADF test checks whether the next-period price change is negatively proportional to the gap from the mean; most single instruments fail it, so you build a long/short portfolio. "the x the next period tries change" [0:13:24]
- Correlation concerns short-term returns and cointegration concerns long-term prices; Coca-Cola and Pepsi had 0.48 daily return correlation but their spread did not mean revert over 8 years. "daily returns correlation coefficient or 0 48" [0:18:19]
- Transaction costs, including the bid-ask spread, often kill mean reversion backtests that look good on paper. "on paper it might look very good" [0:24:08]
- Optimization is controversial; it is easy to fit in sample and fail out of sample, and Chan says he does not personally use it. "and controversial i personally don't use optimization" [0:36:40]
- Chan says mean reversion has had a higher Sharpe than momentum but carries tail risk similar to shorting volatility, and that in recent years mostly mean reversion has worked. "don't need to worry about mean reversion" [0:58:26]

Architecture:
- Data: daily or intraday prices; rule of thumb of 100 data points for a mean reversion study. "say as a rule of thumb 100" [0:58:43]
- Bollinger Bands with a moving average mean and standard deviation entry level; half-life to set time frame and lookback. "level the entry level in the bollinger" [0:22:37]
- Execution: pairs, index arbitrage, long/short portfolios; Interactive Brokers portfolio margin needs about $120k equity for long/short equities, per the speaker. "so called portfolio margin from interactive brokers" [0:54:09]
- Risk: tail risk, data snooping when searching pairs (less severe than parameter optimization). "if you are going to optimize parameters" [0:50:00]

Worked:
- Cointegration testing uses more data than trading signals so it is statistically stronger. "every minute every second so the statistical" [0:50:48]

Failed:
- Warned that mean reversion can suffer big losses in a collapse like 2008. Course promotion for Quantra is self-interested (unverified benefits). "to benefit from this course i think" [0:44:06]
