<!-- voice-ignore-file -->
# Backtesting a Trading Strategy | Use Interactive Brokers to Build a Backtesting Environment | QuantInsti Quantitative Learning | 7blfFDpKJEg | 0.56 h

Teaches: A QuantInsti EPAT project talk by Mark Pandell on building a Python backtesting and live-trading platform on Interactive Brokers through IBridgePy, ported from TradeStation. He shares no money-making strategy.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- The talk is about the build, and the speaker says it offers no profit strategy. "focuses more on the learning journey rather than offering up any money making strategy insights" [0:04:14]
- The goal was a platform that connects to Interactive Brokers through IBridgePy, tests strategies on stock portfolios and later runs TradeStation strategies live. "develop a platform to connect with interactive brokers using ibridge pi" [0:06:43]
- The placeholder strategy buys below the lower Bollinger band, sells above the simple moving average, shorts above the upper band and covers back at the average. "a buy signal was generated when the price fell below the lower bollinger band" [0:08:18]
- The workflow was a paper account with data subscriptions, then the portfolio loop with long and short sides, then simple analytics. "set up a paper trading account with interactive brokers" [0:09:41]
- TradeStation trade management that took 50 lines needed over a thousand lines of Python. "took well north of a thousand lines of code in python" [0:14:38]
- He reports about four months to get the trade-management port working while learning Python. "took me about probably about four months to to get it working" [0:27:21]
- His trade management uses staged exits, trailing stops and regime-change switches. "staged exits um trailing stops maybe market regime change switches" [0:26:33]
- His objective is S&P 500-like returns with lower volatility and drawdown, in a bull market that made a 50% short book difficult. "the s p 500 but actually reduce the the volatility" [0:18:58]
- TradeStation's route to Interactive Brokers is unavailable to US residents, a reason for the Python platform. "you can't actually access that capability if you're living in the us" [0:23:48]
- Foreign stock portfolios correlate less with US markets and reduce currency risk, so the platform widens the universe. "they are correlated with the u.s markets but but but but less" [0:24:55]
- Next steps are machine learning and dynamic portfolios ranked in real time. "integration of machine" [0:16:42]
