# Commercial Platforms

Prices fetched from each vendor site on 2026-11-27. Where a site rendered prices client-side or blocked the fetch, the row says so and gives the closest published figure.

| Platform | Role | Price | Code | Live Assets | Source |
|---|---|---|---|---|---|
| TradingView | Charting, screener, Pine Script alerts | Basic free; Essential $12.95/mo, Plus $29.95/mo, Premium $59.95/mo, Ultimate $199.95/mo, all billed annually. Active price alerts: 3, 20, 100, 400, 1,000 | Pine Script, webhook alerts on paid plans | Broker integrations; no native order engine for custom code | tradingview.com/pricing |
| QuantConnect Cloud | Hosted LEAN backtest, research, live | Free tier with one backtest node and one research node. Quant Researcher, Team and Trading Firm packs; prices render client-side and were not readable. Onboarding from $4,800. 1 USD = 100 QCC credits; SMS alert 1 QCC in US | C#, Python on LEAN | Equities, options, futures, FX, crypto through IBKR, Alpaca, Coinbase, Binance and others | quantconnect.com/pricing, docs tier-features |
| MetaTrader 5 | Retail FX and CFD terminal | Free to traders; brokers license the platform from MetaQuotes | MQL5 Expert Advisors, multi-currency strategy tester | FX, CFDs, some exchange futures and stocks, per broker | metatrader5.com |
| NinjaTrader | Futures platform and brokerage | Free plan $0 with $0.39 micro / $1.29 standard per side; Monthly $99 with $0.29 / $0.99; Lifetime $1,499 one-time with $0.09 / $0.59. Exchange and NFA fees extra | NinjaScript, C# | CME futures | ninjatrader.com/pricing |
| Composer | No-code symphony builder and auto-rebalance | Starter $0; Advanced $10/mo; Pro $32/mo, $16/mo promo billed yearly with API access; Business by call | Visual blocks plus AI builder; API on Pro | US stocks and ETFs, crypto | composer.trade/pricing |
| Alpaca | Commission-free API broker | Market data Basic free with IEX feed; Algo Trader Plus $99/mo with full SIP. Broker API data by sales | REST and websocket, alpaca-py | US stocks, ETFs, options, crypto; paper accounts | docs.alpaca.markets market-data page; main pricing page returned 404 |
| Interactive Brokers API | Global multi-asset broker | IBKR Lite $0 on US stocks and ETFs; IBKR Pro fixed USD 0.005 per share, capped at 1% of trade value | TWS API, Client Portal REST, FIX; Python via ib_async | Stocks, options, futures, FX, bonds in 150+ markets | interactivebrokers.com commissions-stocks |
| TradeStation | Broker with EasyLanguage and API | $0 base on US stocks and ETFs; options $0 to $0.80 per contract by tier; futures $0.50 to $1.75 per side, micros $0.25 to $0.50 | EasyLanguage, REST API | Stocks, options, futures, crypto | tradestation.com/pricing |
| Numerai | Crowdsourced hedge fund tournament | Free to join; participants stake NMR on predictions and earn or burn NMR by score | Python or R on obfuscated feature data | No trading; Numerai, Signals and Crypto tournaments | numer.ai |
| WorldQuant BRAIN | Alpha research simulator and consultant pipeline | Free sign-up; site lists no fee. Top performers are offered paid consultant roles, paid on alpha quality | Fast Expression alpha language, 400,000+ data fields | No trading by users | worldquant.com/brain |

## Fit

- TradingView: the quickest alert surface. A Pine alert with a webhook can feed the notify layer, though the logic then lives outside version control.
- QuantConnect Cloud: the hosted version of the LEAN card (`lean.md`). Useful when local data licensing costs exceed the pack price.
- Alpaca and IBKR: the two execution venues the YouTube corpus used (`../06-youtube/SYNTHESIS.md`). Alpaca for paper and US equities, IBKR for everything else.
- NinjaTrader, MetaTrader, TradeStation: closed scripting languages. Skip for a Python system unless a futures desk needs them.
- Composer: a reference for rules-based ETF rotation; no fit for custom code below Pro.
- Numerai and BRAIN: research training grounds that pay for signal; neither runs a portfolio.
