<!-- voice-ignore-file: transcript-derived digest -->
Python Algorithmic Trading Course - Massive, SnapTrade & Alpaca Integrations | freeCodeCamp.org | zH2Mg782XhA | 1.73 h

Teaches: A Django build of a 12-1 month momentum paper trading app: Massive market data, SnapTrade brokerage connection, Alpaca paper account, SQLite models, momentum scoring and buy signals. The course was funded by a grant from SnapTrade and Massive.

Claims:
- SnapTrade connects the app to Alpaca via OAuth; the client syncs positions and balances, places market buy orders by notional value (day time in force), stores both external and SnapTrade order IDs, and polls order status. "variables so that we could actually connect" [1:15:06]
- Strategy settings (12 and 1 month windows) live in settings.py; the strategy engine rebalances weekly or monthly, ranks, generates signals and executes them; a backtest method is left as a placeholder homework item. "strategy can either be weekly or monthly" [1:28:37]
- Demo signals were a flat $100 notional buy for each of the top 10 rather than weighting by momentum. "10 momentum stocks so there's this buy" [0:14:12]
- Data models: Stock, PriceData, MomentumScore, TradingSignal, RebalanceEvent, Portfolio, Position, Trade, PerformanceMetric. "momentum score has the following fields stock" [0:31:03]

Architecture:
- SQLite via Django ORM. "going to add stars sqlite 3 and" [0:24:51]
- Signal: 12-1 momentum score, quintile ranks, buy top 10. "this is march 2026 the top 10" [0:10:11]

Worked:
- Massive pulled 12 month and 1 month prices for AAPL and NVDA; momentum scores calculated for 50 stocks. "sell trade then we have quantity price" [0:37:41]
- A $100 notional order for Walmart and later Intel appeared in the Alpaca paper account; the demo shows Intel up 98.5% over 12 months and top names mostly AI and tech. "means that intel is up 98 5%" [0:10:37]

Failed:
- Backfill hit rate limits and the full momentum recalculation takes about 3 minutes. "time like it might take 3 minutes" [1:36:58]
