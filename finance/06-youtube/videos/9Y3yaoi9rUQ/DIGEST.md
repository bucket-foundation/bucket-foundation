<!-- voice-ignore-file: transcript-derived digest -->
# Algorithmic Trading - Machine Learning & Quant Strategies Course with Python | freeCodeCamp.org | 9Y3yaoi9rUQ | 2.99 h

Teaches: A three-project Python course building research-only strategies: K-means clustering on S&P 500 stock features with max-Sharpe portfolios, a Twitter engagement-ratio ranking for NASDAQ 100 stocks, and a GARCH volatility signal combined with RSI and Bollinger Bands on simulated intraday data. The instructor states nothing is executed live and it is not financial advice.

Claims:
- Reflexivity: once a predictable pattern is found and traded, others exploit it and it gets arbitraged away. "be arbitrage away so it's this reflexivity" [0:06:37]
- Hardest to predict: returns and prices, then return direction, then economic indicators; volatility is comparatively straightforward. "thing is to predict an economic indicator" [0:07:01]
- Project 1 downloads Fama-French factors and calculates rolling factor betas for each stock as features. "calculate rolling factor betas for each stock" [0:10:08]
- K-means with 4 clusters per month initialized on target RSI centroids (30, 45, 55, 70) keeps cluster labels consistent; cluster 3 (RSI around 70) is the momentum cluster chosen for each monthly portfolio. "then 55 the same cluster then 45" [1:14:18]
- Portfolio weights from PyPortfolioOpt max Sharpe with a 10% max weight and a lower bound of half the equal weight, using one year of daily prices; the optimizer fails some months, handled by falling back to equal weights. "with the optimized max sharpie ratio weights" [1:28:37]
- Project 3 goes short when the predicted volatility premium is above 1.5 rolling standard deviations, else long. "whenever we have those conditions met we are going into a short position" [2:51:17]

Architecture:
- Project 3 uses a supplied CSV of simulated 5-minute data. "the name of the file is simulated 5 minutes data" [2:31:26]
- Signal: cluster membership by RSI momentum; engagement ratio ranking; GARCH prediction premium above 1.5 rolling standard deviations combined with intraday RSI and Bollinger band extremes. "a weight of 0 01 so 1" [1:43:57]
- Risk: max 10% per stock, min half equal weight, liquidity filter. "be 2 5% half of equal weight" [1:30:05]

Worked:
- Instructor says the engagement ratio rank gave a little value above NASDAQ, and ranking by comments gave similar slightly higher results; ranking by likes underperformed (unverified, no figures stated). "results however a little bit um higher" [2:26:55]
- Intraday strategy traded rarely, with no trades for almost 6 months, then returns on days when both signals matched (simulated data). "haven't trade for almost six months but" [2:58:34]

Failed:
- Stock lists are not survivorship-bias free, which likely skews results upward. "back test strategies using survivorship free bias" [0:11:34]
- Random K-means initialization gave inconsistent cluster labels month to month. "to 7075 but using the random initialization" [1:13:04]
- Max Sharpe optimizer reported infeasible status in some months, leaving gaps until equal-weight fallback. "uh optimization failing for the max sharp" [1:54:08]
- Switching the selected cluster changes results dramatically. No final performance numbers are stated. "see that the results would change dramatically" [2:04:44]
