<!-- voice-ignore-file -->
# Full Algo Trading Course | Python Trading Bot | Python Quantitative Trading | 3/3 | QuantInsti Quantitative Learning | mrl3I4oBxNE | 1.50 h

Teaches: Part 3 of a Blueshift (QuantInsti) course that builds an RSI threshold strategy with the platform's visual no-code editor, then backtests it, converts it from daily to weekly and tunes thresholds and costs. Results are in-platform backtests on one example.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- Research and refinement never end and are what keep a strategy sustainable. "research and refinement is the ingredient step" [0:16:23]
- A dynamic universe filter is needed because past index membership, such as the Nifty 50, is usually unknown. "how the nifty 50 portfolio looked in the past" [0:14:25]
- The platform offers minute and daily data sets, and a 30-minute strategy is built by resampling. "two data sets uh the one is the nse mini one is the minute data set" [0:27:28]
- The trading rule goes long when RSI is above a threshold, with the day's example changing it from 60 and 50 to 40. "the threshold value that we are going to use is 40" [0:42:51]
- The visual builder separates universe, alpha factors, entry rule and exit rule, so a second factor such as a 10-period exponential moving average is a new block. "exponential moving average" [0:45:03]
- The backtest runs from 1 January 2015 with 100,000 rupees of initial capital. "initial capital of 100 000 rupees" [0:50:07]
- Position sizing of 25% per stock across four stocks avoids over-leveraging. "i would inadvertently go ahead and uh over leverage it which i don't want" [0:54:27]
- The exit rule changes from 40 to 70, making 70 overbought and 40 oversold, by changing one variable. "you exit whenever it's a 70" [1:00:58]
- Self-reported: switching from daily to weekly execution changed the Sharpe ratio from 1.76 to 1.73 while running 52 times a year rather than 252. "earlier it was 1 76 now it's 1 73" [1:01:19]
- Weekly execution runs at the first day of the week 15 minutes after the market opens. "execute the strategy on every week and i want to start on the first day" [0:59:32]
- Self-reported: the platform reports a stability of time series figure of 97 on a 0 to 100 scale. "the stability of time series is 97" [1:03:31]
- Winning months are about 18% against 17% losing months, but the losses are smaller in size. "negative returns are quite less" [1:05:08]
- Backtest and execution algorithms are separate on the platform, so a Jupyter notebook backtest is not the live code. "those two algorithms are separate" [1:07:56]
- Costs and slippage are set in the platform, for example 50 cents a trade and 10 cents a share. "i can set my slippage accordingly" [1:17:04]
