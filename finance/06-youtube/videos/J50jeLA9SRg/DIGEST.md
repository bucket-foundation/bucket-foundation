<!-- voice-ignore-file: transcript-derived digest -->
# Claude Code + QuantConnect: How I Monitor My Live Trading Bot | Tim Sergeev | J50jeLA9SRg | 0.19 h

Teaches: Tim Sergeev's 2026 walkthrough of a Telegram bot, built with Claude, that monitors live and paper QuantConnect strategies by comparing live results with backtest expectations. Promotes his own cohort.

Claims:
- QuantConnect's default live view lacks context, so he pushes backtest data and live order events to a Telegram bot that always shows where each strategy stands. "it pushes all the order events to my telegram" [0:02:02]
- An analytics command compares live drawdown and return with backtest numbers and with ten years of backtested regime behavior, for example 1.2 percent live drawdown versus 32 percent in the backtest. "it actually compares from the back testing for for for the last 10 years" [0:05:24]
- A paper-account breakout strategy showed a slightly lower win rate and far lower P and L than backtest, which he attributes to a quiet July and too few trades to judge. "the amount of trades it has done it's not still not enough" [0:06:12]
- The bot lists recent trades across strategy versions, marks paper trades, and has a liquidate command with a double confirmation that closes a strategy's positions. "it's going to double confirm" [0:09:17]

Architecture: QuantConnect order events and backtest stats pushed to a Telegram bot, with analytics, recent trades, and liquidate commands.

Worked:
- none reported

Failed:
- none reported
