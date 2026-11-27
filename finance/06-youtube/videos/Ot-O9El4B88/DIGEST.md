<!-- voice-ignore-file: transcript-derived digest -->
# Automated Trading | How To Automate A Trading Strategy | QuantInsti Quantitative Learning | Ot-O9El4B88 | 1.06 h

Teaches: QuantInsti webinar by Rishabh Mittal (Quantra) on automating a trading strategy, with a moving average crossover coded and run live on the Blueshift platform, followed by audience Q&A.

Claims:
- Automation executes pre-set rules without emotion, since "decision to buy or sell is not dictated" by feeling, and can act on several stocks at once. Mittal's examples are a missed entry across six opening-range trades, a mistyped 1,000 shares instead of 100, and a forgotten futures position that wiped out an account [0:05:09]-[0:07:10].
- Automating needs "a broker with an API connection", a defined strategy and basic Python. Blueshift offers one set of functions across Alpaca (US), MasterTrust (India) and FXCM (forex) [0:07:10]-[0:10:15].
- The demo strategy trades Apple and Google on 15-minute bars: "I will go long when SMA 20 is greater than SMA 50" with no open position, exit when SMA20 falls below SMA50, and give each stock 50% of capital. Every condition must be stated explicitly [0:10:15]-[0:12:17].
- The code uses "special function specific to Blue Shift" called initialize to set the stock list and SMA lengths once, a schedule function to run every 15 minutes from 9:30 to 3:45, and data.history to pull the last 900 one-minute closes, which are resampled to 15-minute bars [0:16:25]-[0:23:34].
- Signals come from the mean of the last 20 and last 50 closes. Orders go through "is called order_target_percentage" with 50% to buy and 0 to exit, and portfolio.positions shows whether a position is open [0:26:36]-[0:29:39].
- Blueshift reports return, alpha ("how much extra did you earn over the market return", about 7% here), beta, Sharpe ratio and maximum drawdown, for example a fall from 120 to 90 is a 25% decline [0:29:39]-[0:31:42].
- Going live took "in about uh 60 to 80 lines of code". Settings include a drawdown limit (50 in the demo), a cap of 30 orders per day, and auto execution versus one-click approval, here with Alpaca paper trading at $10,000 [0:32:42]-[0:34:44].
- A general recipe for any broker starts with "authenticate your account using an API key", then defines the universe, loops the logic at a fixed interval, fetches data, builds explicit entry and exit signals and calls the broker's place-order function [0:36:48]-[0:39:50].
- Mittal says "we operate on a low frequency of trading" for most retail algorithmic traders, so Python works well, and C++ is needed only for speed-sensitive strategies [0:54:04]-[0:55:04].

Framework: Break any strategy into stock selection, indicator choice, time frame, entry and exit rules and capital allocation, "how I have broken it down into pieces", then map each piece to API calls for data, signal logic and order placement [0:10:15]-[0:14:21].

Worked:
- The SMA crossover on Apple and Google backtested on 7 September 2021 with the NYSE minute data set; Mittal says alpha came out to about 7% [0:29:39]-[0:30:40].
- Resampling 1-minute closes to 15-minute bars gave a 2:15 candle close of 153.512 [0:22:33]-[0:23:34].
- A user's wish to trade at 1:29 p.m. daily is possible by scheduling the run function at that time [0:50:00]-[0:51:00].

Failed:
- The live deployment Mittal started on the 7th, with Apple and Microsoft, was down by a lot [0:34:44]-[0:35:47].
- Mittal says free minute-level data for USDINR does not exist; intraday data has to be paid for [0:57:07]-[0:58:08].
- Mittal says he is unsure of Python packages for price action patterns and would have to check [0:48:59]-[0:49:00].
