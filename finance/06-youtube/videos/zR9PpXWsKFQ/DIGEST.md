<!-- voice-ignore-file: transcript-derived digest -->
# Production Engineering When Trading Billions of Dollars a Day | Jane Street | zR9PpXWsKFQ | 1.14 h

Teaches: How a Jane Street production engineer runs live trading software: four features of the trading environment (every order matters, automated trading is scary, timing matters, users are internal), the event-based alerting and defense in depth that follow from them, and a composite incident walkthrough. Recruiting-style talk from an employee, so it is a firm self-portrait.

Claims:
- Production engineering covers hardware failures, cooling outages, cut cables, exchange issues and the firm's own bugs; an order has five parts: side, quantity, symbol, price and currency. "their cables cut uh connected to exchanges" [0:01:57]
- Market volume spikes at open and close; planned events (FOMC) and unplanned ones (a tweet, an invasion) change volatility. "the events are unplanned um trump tweets" [0:14:50]
- Jane Street does little SLO monitoring on live trading, since a 99.99% success rate hides the one order that matters; it uses event-based alerts that force a decision on every edge case. "traditional with maybe more slo based monitoring" [0:17:17]
- Alert on symptoms rather than causes, e.g. page on 500 errors and attach database status as metadata. "they care about the 500 errors um" [0:25:17]
- The favorite alert is "fill too good" (made too much money); it can catch bad market data, instrument generation, order engine bugs, rogue traders and fat fingers, and it goes to the order engines team as the last line of defense. "trader if a trader has fat fingered" [0:27:21]
- Defense in depth: similar risk checks in separate systems written by different teams, plus technical and trading-impact monitoring; the firm does not trade unless monitoring is up. "run similar alerts in different systems written" [0:31:18]
- In the sample incident, a missed exchange email about a market data feed split left stale prices live. "going to split the market data feed" [0:43:54]
- Knight Capital lost about half a billion dollars in 45 minutes after losing money at 8x the earlier speed. "45 minutes later they had lost about half a billion dollars" [0:12:44]

- Layer independent checks owned by different teams; keep monitoring more reliable than the trading systems it watches; give support staff trading context and traders technical context. "own risk checks monitored by a trader" [0:31:31]

Worked:
- The fill-too-good alert caught a market data fault that no service-health alert flagged. "our fill two good thresholds are too" [0:41:40]
- Trader reports of stale data on the incident call were the turning point in resolution. "traders join the incident call and report" [0:48:31]
- Developers own the alerts for their own systems, which the speaker says lets teams move fast with confidence. "teams tend to monitor their own systems" [0:56:29]

Failed:
- Alert cascades when many systems fail are handled imperfectly; the speaker says the firm does not do great there. "we wouldn't raise a cascade of alerts" [1:07:21]
- Naming and logging conventions differ across teams because there are almost no top-down edicts. "the devs decided to use different conventions" [0:59:49]
