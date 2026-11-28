<!-- voice-ignore-file: transcript-derived digest -->
# 10 Categories of Mean Reversion Explained: Pairs Trading, VIX, & ML | QuantInsti Quantitative Learning | c2j-zs8YN3c | 0.28 h

Teaches: A QuantInsti tutorial by the host Mo listing ten categories of mean reversion strategy, from price and return reversion to options and microstructure.

Claims:
- Mean reversion rests on stationarity, a process whose mean and variance stay roughly stable, and deviations are quantified with a z-score, "the number of standard deviations". [0:02:05]-[0:03:08]
- Price-level mean reversion assumes price oscillates around a moving average, as in a Bollinger band strategy, and it works in range-bound markets but fails in strong trends, "fail when markets are actually trending". [0:03:08]-[0:04:08]
- Return mean reversion rests on negative autocorrelation after liquidity shocks or overreaction, for example a 5% one-day drop followed by a short-term recovery, "negative autocorrelation in returns". [0:04:08]-[0:05:09]
- Indicator-based versions use thresholds such as RSI below 20 as oversold and above 80 or 90 as overbought, "RSI below 20". [0:05:09]-[0:06:10]
- Relative value reversion covers pairs trading, with Coca-Cola and Pepsi as the example, and cross-sectional versions that buy underperformers and short outperformers, "go long on what is undervalued". [0:07:12]-[0:08:13]
- Volatility is described as one of the most reliable mean-reverting quantities: when the VIX rises to the 35 to 40 range it tends to come back near 15, "35 to 40". [0:09:15]-[0:10:19]
- Machine learning versions learn the probability and expected half-life of reversion from features such as volatility, momentum, distance from the mean and autocorrelation, "expected half-life of reversion". [0:12:22]-[0:13:25]
- Microstructure reversion arises when aggressive buyers push price a few ticks and liquidity providers push it back, a thing high frequency traders capture a fraction of a cent at a time, "a fraction of a scent repeatedly". [0:14:26]-[0:15:26]

Framework: Ten categories organized by what is assumed to revert: price level, returns, indicators, relative value, fundamentals, factor residuals, volatility, regimes, machine learning output, options and microstructure, "10 distinct categories of mean reversion". [0:02:05]-[0:15:26]

Worked:
- Pairs trading on Coca-Cola and Pepsi: go long the undervalued and short the overvalued leg and expect the spread to converge. [0:07:12]-[0:08:13]
- A short-volatility trade profits when implied volatility spikes after a shock and then drifts down. [0:13:25]-[0:14:26]

Failed:
- Volatility can stay elevated longer than expected in systemic events, so hedging and dynamic position sizing are needed, "remain elevated for longer than expected". [0:10:19]-[0:11:21]
- Regime changes break the equilibrium assumption; the speaker's example is gold sitting quiet for months and then breaking out after a central bank announcement, "the mean itself is shifted". [0:11:21]-[0:12:22]
