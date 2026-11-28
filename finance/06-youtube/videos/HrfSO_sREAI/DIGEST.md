<!-- voice-ignore-file: transcript-derived digest -->
# Turning to data for a trading edge · Dave Bergstrom, quant trader | Chat With Traders | HrfSO_sREAI | 0.93 h

Teaches: Chat With Traders episode 103 (2016) with Dave Bergstrom, a quant trader at a high-frequency firm, on moving from retail technical trading to data mining: learning to program, searching fitness functions, trade count and curve fitting, Monte Carlo reshuffles and equal bet weighting.

Claims:
- Bergstrom builds a master program that searches for rules against a fitness function such as P and L to drawdown ratio, profit factor or win percentage. "you search for a fitness function" [0:25:31]
- Confidence in an edge needs a large number of trades, as a coin with 700 or 800 heads is clearly not fair, and adding rules makes curve fitting easier. "if you you know can show that The Edge persists over a large number of Trades" [0:30:15]
- He reshuffles trades into many Monte Carlo equity curves, and the single historical backtest often sits at the top of that distribution, so it overstates what to expect. "that back test was at the very top of the distribution" [0:35:18]
- Lower-frequency bars such as 15 or 30 minutes still give enough trades, since higher frequency data makes it easier to reach a high trade count. "it's easier to get to um a higher number obviously with higher frequency data" [0:45:10]
- He says technical analysis teaches visual chart reading, and that data should confirm an idea rather than be read by eye. "you need to make sure the data is confirming" [0:15:07]
- He does not do latency arbitrage and says he is not versed in it. "it's not something that we do" [0:50:18]

Architecture: Strategy search harness: fitness-function search over rule combinations, then Monte Carlo reshuffle of trade sequence to compare the backtest with the distribution.

Worked:
- none reported

Failed:
- none reported
