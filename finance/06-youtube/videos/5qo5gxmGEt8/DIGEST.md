<!-- voice-ignore-file: transcript-derived digest -->
# Macrocephalopod - Managing a Mid-Frequency Crypto Prop Desk (S6E5) | Flirting with Models | 5qo5gxmGEt8 | 1.02 h

Teaches: An anonymous quant on the move from slow futures style premia at a hedge fund to a mid-frequency crypto prop desk: why backtests are a final check, equity factor hedging inside a multi-manager fund, how crypto infrastructure and exchange risk differ, why market impact modeling matters, and where new alpha ideas come from.

Claims:
- Daily futures strategies such as trend and carry earned a Sharpe ratio of about 1.5 to 2 for 10 to 15 years, until the 2008 financial crisis. "sharp of like one and a half to two for 10 to 15 year period" [0:07:54]
- Equity strategies keep persistent predictive edges, and the broad universe of names gives enough data to validate them by splitting the universe. "such a broad universe of names you've got a lot of data" [0:12:05]
- Research is what he does before the backtest; the backtest validates the idea and shows what performance might look like. "the research is what you do before you run the back test" [0:14:22]
- With 100 managers at Sharpe 1 and 20% correlation, diversification can at most double Sharpe; cutting correlation to 10% triples it and to 5% quadruples it (his simple model), which is why factor hedging pays. "if you're diversifying among those 100 managers" [0:21:10]
- Macro factors are better hedged with high-frequency proxies (dollar, 10-year yield, crude oil) than with GDP or CPI surprise betas, which have too few data points. "dollar the yield on the 10 year" [0:22:50]
- A prop shop has aligned owners and capital providers, so it can invest in long-term infrastructure; a hedge fund is pushed to scale at the cost of Sharpe quality. "hedge fund that would be the investors" [0:24:22]
- Crypto differs by combining exchange, clearing, prime broker and financing in one firm, real-time liquidation, treasury management as "operational alpha", and websocket text market data with high latency jitter. "exchange and clearinghouse and the prime broker" [0:28:44]
- Exchange risk: a 20% a year strategy needs five years of assets at the venue to cover the amount at risk, so some exchanges are never traded and capital per exchange is capped. "make 20 a year on my capital" [0:33:19]
- A short position of 1% of the book in a coin that rises tenfold, at 5x leverage, costs half the trading capital. "that's half of your trading capital" [0:37:43]
- Slippage can dominate costs; empirically the square-root impact law is arbitrageable in simulation, which signals a missing factor. "trade because of the square root law" [0:53:12]
- New ideas lag papers by 5 to 10 years; he finds new ones in new datasets, watching order books and talking to other traders. "get five to ten years of lag" [0:57:28]

- Research with features and regressions first; backtest to check and compare; reconcile live against simulation each period; model impact, fills and borrow more accurately as size grows. "would use it to compare different simulation" [0:16:36]

Worked:
- Combining many weak equity edges after costs. "looks good after transaction costs in equities" [0:12:55]
- Forming momentum baskets on residuals after neutralizing sector, country, value and quality, to capture hidden common drivers. "on the residuals of that you're capturing" [0:43:11]

Failed:
- Assuming small trades have little impact, which makes backtests unreflective. "modeling of market impact leads to assumptions" [0:50:25]
- Currency spread weak edges are so weak that it is easy to fool yourself. "equities whereas in currencies your weak edges" [0:12:57]
- Trading venues with opaque ownership or inflated volumes. "you have concerns around very inflated volumes" [0:34:05]
