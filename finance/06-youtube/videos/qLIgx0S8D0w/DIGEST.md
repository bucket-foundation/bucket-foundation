<!-- voice-ignore-file -->
# Python Trading Strategies | Create Trading Strategies And Backtest | Portfolio Management Techniques | QuantInsti Quantitative Learning | qLIgx0S8D0w | 1.41 h

Teaches: A Blueshift (QuantInsti) workshop on building a Python strategy in the platform: the design cycle, the initialize and handle-data event loop, technical-indicator advisors, and an agent that allocates capital among advisors by performance weighting or Kelly. Backtests are in-platform and favorable market conditions are acknowledged.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- The design cycle for a systematic strategy starts with selecting the universe, which depends on the capital you trade. "the design cycle for systematic strategy is something like this you first start with selecting your universe" [0:06:25]
- Test with both backtesting and forward testing, because not everything can be simulated in a backtest. "not everything you can simulate in a baptist that can happen in an actual market" [0:10:26]
- The speaker is convinced that no single strategy works at all times, so the backtest platform should be flexible. "there is no such strategy" [0:11:05]
- Event loop: initialize runs on the first day, before-trading-start runs at 8:45 a.m. India time, handle-data runs every minute from 9:15 and analyze runs at the end. "for every minute starting from 9 1559 we are getting this handle data called" [0:19:06]
- To trade every 15 minutes, the code runs the strategy only when the minute number is a multiple of 15. "if it is only only multiple of 15 the minute number" [0:36:15]
- The strategy requests 375 one-minute OHLC bars for every instrument in the universe. "375 is 375 minutes" [0:37:34]
- Bug story: all positions stayed flat because a 10,000 account could not afford any Nifty constituent, so the account value was raised. "we only have 10 000 in our account so our algorithm doesn't have enough money to buy any one of them" [0:52:47]
- The same advisor template was run on Bollinger bands, moving average crossover, Fibonacci support and resistance and candlestick patterns, each reported as performing recently. "we have a case of bollinger bands then we have a case of moving average crossover" [0:54:42]
- Indicators are usually correlated because most are built from the same price data, as principal component analysis shows. "they should be correlated if we do a statistical analysis" [0:45:40]
- A committee of advisors improves stability, not accuracy, of the signal. "not by being more accurate but by being a more stable" [0:58:19]
- An agent allocates capital across advisors using a weighting function with a learning rate between 0 and 0.5. "this should be between 0 to 0 5" [1:12:58]
- Kelly weighting uses return versus variance, with the speaker noting a geometric Brownian motion assumption that expected geometric return is the mean less half the variance. "the kelly criteria is very simple" [1:09:27]
- Check: with three advisors made random, the agent should cut their weights to near zero, and in the run two advisors fell to 0. "all this 2 has been allocated 0" [1:13:50]
- Platform limit: no third-party data feeds are allowed, and a commission and slippage model exists. "no we do not allow any third party data" [1:20:36]
