<!-- voice-ignore-file: transcript-derived digest -->
# Backtest Your Crypto Strategies with Freqtrade (Full Setup Tutorial) | Yurii Kuzemko | 2ZbtXVScXJE | 0.87 h

Teaches: Setting up the open-source Freqtrade bot in Docker and backtesting a stock open-source spot strategy on 5-minute Binance data, then tuning stop loss, EMA filters and pair count. The speaker concludes the simple strategy is not scalable.

Claims:
- A 1% daily return compounds to about 35% in a month, which the speaker calls unrealistic; he targets 3 to 5% monthly. "have 1% of daily return and compound" [0:00:23]
- Commercial crypto bots take a profit share and some are scams, so he prefers building and testing his own on Freqtrade, which is open source and supports centralized exchanges only. "you're using some commercial crypto trading bots" [0:03:24]
- The sample strategy is spot-only, so it works only in bullish markets; it uses a tiered minimal ROI table (4% at 20 min, 3% at 30, 1% at 60), a stop loss and a disabled trailing stop. "30 minutes 3% 60 minutes uh 1%" [0:09:59]
- Freqtrade hyperoptimization made the code hard to read and the speaker judged it overkill. "i find it overkill" [0:27:31]
- Strategy is highly sensitive to bearish dips; he says its returns do not match the stock market and it is not scalable. "not even matching the stock market and" [0:42:10]
- The speaker says AI assistants lose context quickly on complex code and give ridiculous suggestions. "update every time the context so ai" [0:47:35]

Architecture:
- Data: the last 180 days, about six months, of 5-minute candles downloaded in Freqtrade. "basically downloaded at the last 180 days" [0:13:37]
- Signal: Python strategy class with populate_indicators, entry and exit methods; indicators included Fisher RSI, BB lower band, EMA filters tried later. "odk then fisher rsi bb lower band" [0:12:28]
- Execution: Freqtrade in Docker with FreqUI dashboard, sandbox (dry-run) network with fake funds. "text example i'm using the sandbox network" [0:06:15]
- Risk: a 10% stop loss, which he calls really high, against the 3% he would consider. "10% is really high stop loss" [0:10:33]

Worked:
- In one backtest he reports 30 wins and says the total profit is not satisfying. "we have 30 wins" [0:35:50]
- Raising the stake to 300 gave 4% in 3 months, 1.3% per month, which he says does not even match the stock market. "so it's 1 3% per month" [0:42:02]
- Stop loss of 5% was best over the 6-month period tested. "we made we th000 in 6 month" [0:16:48]

Failed:
- Original strategy lost money over the 6 month test (52 wins vs 3 losses but severe losses) until stop loss was changed; after tuning it made about half a percent in 6 months, worse than an index fund. "conservative let's drop stop loss to 3%" [0:16:59]
- EMA trend filters removed trades or cut profit. "it didn't make any trend" [0:28:52]
- Expanding to 10 pairs lowered profit; Doge lost 10% and Link also lost. "on doge we lost on dodge 10%" [0:40:42]
