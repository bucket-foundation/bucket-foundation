<!-- voice-ignore-file: transcript-derived digest -->
# Freqtrade Short Strategy That Profits From Bear Market Bounces | TradingBot con Ale | ePOj_1zTmUg | 0.20 h

Teaches: TradingBot con Ale (2026) presents a short-only Freqtrade crypto strategy designed to pair with a dual momentum strategy, with survivorship-free token universes, walk-forward validation and a two-strategy portfolio. Results are self-reported backtests.

Claims:
- The universe is rebuilt month by month from the 30 or more largest tokens at the time, because using today's top tokens in an old backtest uses future information. "I reconstructed the token universe month by month" [0:01:48]
- The speaker says many Freqtrade strategies pick today's largest tokens and backtest five years back, which is like knowing the future. "completely unrealistic because I'm going to use current information to perform an analysis of the past" [0:02:16]
- Validation was walk-forward: optimization over 2022 to 2025, then out-of-sample evaluation that was positive though with a slightly lower win rate. "the strategy was validated with the walk-forward analysis" [0:06:03]
- Gains concentrate in 2022, a bear year, which is when the strategy becomes interesting. "The performances are all concentrated in the worst years" [0:06:31]
- In 2022 the dual momentum strategy lost while the short strategy gained, so combining them kept the portfolio in the black in every year, with drawdowns at different times offsetting. "I manage to come out on top every year and come out in the black" [0:08:40]
- Combining both lowers drawdown more than it lowers CAGR, so the Sharpe ratio rises, and Freqtrade can run both strategies as a portfolio. "I have a drawdown that improves" [0:10:08]

Architecture: Freqtrade short-only strategy over a monthly-reconstructed top-30 token universe, validated with walk-forward and run beside a dual momentum long strategy.

Worked:
- none reported

Failed:
- none reported
