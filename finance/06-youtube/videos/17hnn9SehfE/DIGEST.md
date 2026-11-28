<!-- voice-ignore-file: transcript-derived digest -->
# This Algotrading Bot Wins 94% Of Its Trades. That's The Problem. #freqtrade | Kuldeep Singh Rathore | AI Trading Automation | 17hnn9SehfE | 0.24 h

Teaches: Kuldeep Singh Rathore (2026) dissects the Freqtrade NASOSv4 5-minute futures strategy whose 94 percent win rate is a warning sign: dip-buying entry doors, a distant profit target and a rule against selling at a loss. Promotes his own bot dashboard.

Claims:
- Backtest figures quoted: 2,299 trades, 94 percent win rate, 66.5 percent P and L, 7.52 percent max drawdown, Sharpe 3.48 and CAGR 30 percent (self-reported tool output). "the win percent was 94%" [0:03:24]
- The speaker says the 94 percent may be the most misleading number in trading because of three design features that hide losses. "why that 94% might be the most misleading number in trading" [0:05:23]
- The core belief is that a sharp drop after a drift up was panic, not damage, so price will snap back like a stretched rubber band. "the drop was panic, not the damage" [0:06:29]
- The loosest entry door buys when EWO is below minus 14.4 and EMA 50 sits 14 percent under EMA 200 with no euphoria guard, so it buys the collapse. "it will buy the dip. It will buy the panic and it will even buy the collapse" [0:11:23]
- The strategy has a profit target so far away it may never be reached and a rule that stops it from selling a deeply losing trade, so losses stay unrealized. "it has a rule that stops it from selling" [0:06:14]
- The live run showed a 100 percent win rate over about two weeks, which the speaker says needs more backtesting; do not go live without understanding. "please do not go live without understanding and without backtesting it" [0:13:26]

Architecture: Freqtrade NASOSv4: RSI, EMA and EWO entry doors that buy dips, no stop-loss exit, wide profit target.

Worked:
- none reported

Failed:
- Win-rate counting hides unrealized losses because the bot refuses to sell losers. "it has a rule that stops it from selling" [0:06:14]
