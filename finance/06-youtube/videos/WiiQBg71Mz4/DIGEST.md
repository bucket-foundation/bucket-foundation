<!-- voice-ignore-file -->
# Full Algo Trading Course | Algo Trading Strategies | Create and Backtest Trading Strategy | 2/3 | QuantInsti Quantitative Learning | WiiQBg71Mz4 | 1.32 h

Teaches: A QuantInsti webinar that builds and backtests an RSI trend strategy in pandas (long while RSI exceeds a threshold, else flat) on one stock from January 2020, then shifts the threshold from 60 to 50 and discusses risk metrics. A single-stock in-sample example.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- Alpha is the excess return above a benchmark, for example a 15% strategy return against a 10% S&P 500 return is 5% alpha. "that excess 5 would be the alpha of your strategy" [0:11:36]
- Two objectives: beat passive buy and hold and avoid large sudden account drops of 30 or 40 percent. "we don't want to see our account going down suddenly" [0:21:32]
- A fundamentals screen example: quarterly year-on-year profit growth above 30% and a price-to-earnings ratio below 40. "the year on year profit growth for the latest quarter is greater than 30" [0:27:24]
- RSI is a 0 to 100 indicator; the common reading treats 80 as overbought and 20 as oversold, but he uses it as a trend signal around 60. "some traders will tell you that you use the 80 20" [0:30:28]
- Rule: buy and stay invested if RSI is above 60, otherwise exit. "buy and stay invested if rsi value is greater than 60 else exit" [0:33:20]
- Backtest window is 1 January 2020 to mid-January of the current year, on adjusted close prices so corporate actions are handled. "it is already adjusted for all the corporate actions" [0:35:41]
- Position is 1 where RSI exceeds the threshold and 0 below, computed on daily data. "it has a value of zero whenever the rsi is below 60" [0:38:22]
- Self-reported: one dollar in buy and hold became 0.9 while the RSI 60 strategy made about 20% over the year and avoided a big drop. "we would have made 20 in one year" [0:42:47]
- The gap is about 30 percentage points, which he calls the edge. "almost 30 percent" [0:43:43]
- He asks whether 60 is the best threshold and answers that it must be tested on the data. "is this the best threshold right we don't know" [0:43:55]
- Threshold stored as a variable so it can be varied to 50 or 40 without recoding. "instead of just putting 60 over here as a number i created a variable" [0:44:25]
- Self-reported: with threshold 50 the RSI strategy returned roughly 65%, about 73 percentage points above buy and hold. "are roughly 65" [0:46:39]
- Warning: he calls the 60 to 50 move very basic optimization and does not focus on risk, though a full backtest reports Sharpe and Calmar ratios. "this is a very basic level of optimization" [0:51:56]
- Taxes and costs: gains are taxed per the jurisdiction and are not modeled in the example. "you pay whatever the going tax rate is according to your jurisdiction" [1:06:46]
