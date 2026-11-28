<!-- voice-ignore-file: transcript-derived digest -->
# The Art and Science of Algorithmic Futures Trading · Kyle Schultz | Chat With Traders | qz6a27tFmAM | 1.00 h

Teaches: Chat With Traders episode 225 (2021) with CTA manager Kyle Schultz on algorithmic futures strategies: opening range and gap breakouts with filters, three guards against overfitting, strategy diversification, and manual intervention only to cut risk.

Claims:
- The core signal is an opening range breakout or gap breakout, and the secret sauce is the additional filters such as confirmation, volatility and time of day. "the secret sauce is really in those additional filters" [0:18:03]
- Three guards against overfitting: few parameters, walk-forward analysis with varied in-sample and out-of-sample periods, and not taking one optimization output directly. "use walk forward analysis to vary the in-sample and out-of-sample period" [0:06:17]
- Separate long and short parameters double the optimized parameters and raise overfitting risk, so parameter count is a judgment of art as well as science. "there's a little bit of art to the judgment of how many parameters to use" [0:24:40]
- Small changes in parameters that significantly change the backtest indicate overfitting. "look at small changes in your parameters and if that significantly changes your back test, it's likely overfit" [0:42:40]
- Relative-value volatility pairs such as VIX futures versus E-mini S&P are effectively short volatility because spreads blow out when volatility rises. "those strategies are short vol" [0:12:48]
- Portfolio construction checks how strategies perform together in volatility events, since a zero ten-year correlation is a static number for a dynamic quantity. "a very static number for a very dynamic actual metric" [0:36:54]
- He intervenes live only to take risk off, because no one consistently predicts markets. "I don't think anyone can consistently predict what the market's going to do" [0:48:27]

Architecture: Portfolio of momentum and mean-reversion breakout systems per futures market, walk-forward validated, with volatility and time-of-day filters.

Worked:
- none reported

Failed:
- none reported
