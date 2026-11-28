# Trading Software

One card per tool, read from source on 2026-11-27. 302 open-source repos are carded; the clones sit in `../code/` (gitignored), plus `commercial-platforms.md` for ten hosted products and `STRATEGIES-IN-CODE.md` for the strategies found in code. Stars, license and last push come from `gh api repos/<owner>/<repo>` on the same date.

## Comparison Matrix

Live column: venues the code can trade on without extra work. Fit: B backtest, L live engine, C connector, D data, P portfolio and risk, A LLM agent, R research.

| Card | Fit | License | Stars | Last Push | Live Venues |
|---|---|---|---|---|---|
| `nautilus_trader.md` | B L | LGPL-3.0 | 31,860 | 2026-11-27 | IBKR, Binance, Bybit, Polymarket, Kalshi, Databento and more |
| `lean.md` | B L | Apache-2.0 | 22,749 | 2026-11-25 | IBKR, Alpaca, Coinbase, Binance, others through QuantConnect |
| `lumibot.md` | B L A | GPL-3.0 | 2,257 | 2026-11-27 | Alpaca, IBKR, Schwab, Tradier, Tradovate, ccxt, Kalshi, Polymarket |
| `freqtrade.md` | B L | GPL-3.0 | 57,326 | 2026-11-27 | crypto through ccxt |
| `hummingbot.md` | L | Apache-2.0 | 21,415 | 2026-11-27 | CEX and DEX connectors, `kalshi_perpetual` |
| `octobot.md` | L | GPL-3.0 | 6,991 | 2026-11-25 | crypto through ccxt |
| `superalgos.md` | L | Apache-2.0 | 5,827 | 2026-11-14 | crypto through ccxt |
| `jesse.md` | B L | MIT | 8,840 | 2026-11-23 | crypto; live needs a paid plugin |
| `pysystemtrade.md` | B L | GPL-3.0 | 3,645 | 2026-11-02 | IBKR futures |
| `quantdinger.md` | L A | Apache-2.0 | 14,018 | 2026-11-27 | six crypto venues, Alpaca, IBKR |
| `crypto-trading-bot.md` | L | MIT | 3,552 | 2026-08-02 | ccxt, signal-only mode |
| `binance-trading-bot.md` | L | Apache-2.0 | 5,627 | 2026-11-22 | Binance |
| `binance-trade-bot.md` | L | GPL-3.0 | 8,841 | 2025-03-12 | Binance |
| `qbot.md` | B L | MIT | 18,875 | 2026-03-11 | China brokers, Binance |
| `vectorbt.md` | B | Apache-2.0 with Commons Clause | 9,965 | 2026-11-11 | none |
| `backtesting-py.md` | B | AGPL-3.0 | 9,308 | 2026-08-05 | none |
| `backtrader.md` | B L | GPL-3.0 | 23,819 | 2024-08-19 | IBKR, Oanda, stale |
| `zipline-reloaded.md` | B | Apache-2.0 | 2,022 | 2026-11-25 | none |
| `bt.md` | B | MIT | 3,045 | 2026-11-24 | none |
| `qstrader.md` | B | MIT | 3,491 | 2024-06-30 | none |
| `rqalpha.md` | B | non-commercial | 6,899 | 2026-10-28 | none |
| `hftbacktest.md` | B L | MIT | 5,146 | 2025-12-23 | Binance, Bybit |
| `prediction-market-backtesting.md` | B | LGPL-3.0 and MIT | 1,276 | 2026-05-16 | Kalshi, Polymarket via Nautilus |
| `qlib.md` | B R | MIT | 50,626 | 2026-11-04 | none |
| `finrl.md` | B R | MIT | 17,193 | 2026-11-27 | Alpaca paper |
| `rd-agent.md` | A R | MIT | 15,521 | 2026-10-21 | none |
| `tradingagents.md` | A | Apache-2.0 | 123,901 | 2026-11-25 | none, TypeScript research CLI |
| `ai-hedge-fund.md` | A | MIT | 64,872 | 2026-11-09 | paper with approval step |
| `fingpt.md` | A R | MIT | 21,728 | 2026-11-18 | none |
| `finmem.md` | A R | MIT | 973 | 2024-08-18 | none |
| `llm-trading-lab.md` | A | none | 7,563 | 2026-06-24 | manual |
| `kalshi-ai-trading-bot.md` | A L | MIT | 664 | 2026-11-09 | Kalshi |
| `polymarket-agents.md` | A | MIT | 3,818 | 2024-11-05 | order call commented out |
| `tradingview-mcp.md` | A D | MIT | 5,346 | 2026-11-20 | none |
| `poly-maker.md` | L | MIT | 1,541 | 2026-07-09 | Polymarket |
| `kalshimarketmaker.md` | L | MIT | 470 | 2026-04-14 | Kalshi |
| `poly-kalshi-arb.md` | L | none | 445 | 2025-12-21 | Kalshi, Polymarket |
| `polymarket-kalshi-weather-bot.md` | L | none | 845 | 2026-03-02 | signals only |
| `py-clob-client.md` | C | MIT | 1,223 | 2026-05-25 | Polymarket |
| `polymarket-cli.md` | C | MIT | 2,918 | 2026-05-26 | Polymarket |
| `kalshi-starter-code-python.md` | C | none | 102 | 2025-03-07 | Kalshi |
| `pmxt.md` | C | MIT | 2,221 | 2026-09-30 | Kalshi, Polymarket, 13 more |
| `ccxt.md` | C | MIT | 45,005 | 2026-11-27 | 105 crypto venues, Polymarket |
| `ib_async.md` | C | BSD-2-Clause | 1,801 | 2026-11-26 | IBKR |
| `alpaca-py.md` | C | Apache-2.0 | 1,613 | 2026-11-27 | Alpaca |
| `coinbase-advanced-py.md` | C | Apache-2.0 | 365 | 2026-10-19 | Coinbase |
| `yfinance.md` | D | Apache-2.0 | 26,019 | 2026-11-26 | none |
| `openbb.md` | D | Apache-2.0 | 75,789 | 2026-11-25 | none |
| `poly_data.md` | D | GPL-3.0 | 2,356 | 2026-09-08 | none |
| `prediction-market-analysis.md` | D R | MIT | 3,965 | 2026-10-29 | none |
| `riskfolio-lib.md` | P | BSD-3-Clause | 4,626 | 2026-11-04 | none |
| `pyportfolioopt.md` | P | MIT | 6,186 | 2026-07-07 | none |
| `quantstats.md` | P | Apache-2.0 | 7,921 | 2026-11-02 | none |
| `empyrical-reloaded.md` | P | Apache-2.0 | 133 | 2026-11-24 | none |
| `alphalens-reloaded.md` | P R | Apache-2.0 | 699 | 2026-10-26 | none |
| `mlfinlab.md` | R | proprietary | 4,980 | 2023-10-02 | none |
| `gs-quant.md` | R | Apache-2.0 | 14,478 | 2026-11-27 | none |
| `finmarketpy.md` | B R | Apache-2.0 | 3,830 | 2026-04-16 | none |
| `financial-models-numerical-methods.md` | R | AGPL-3.0 | 7,556 | 2026-10-05 | none |
| `machine-learning-for-trading.md` | R | MIT | 22,089 | 2026-11-25 | none |
| `ta-lib-python.md` | R | BSD-2-Clause | 12,436 | 2026-11-27 | none |
| `pandas-ta-classic.md` | R | MIT | 494 | 2026-11-27 | none |
| `awesome-quant.md` | list | none | n/a | n/a | none |

## Recommended Stack

For a notify-first system covering US equities, ETFs, futures, crypto and event contracts. Alerts reach the founder first; orders flow only after paper results clear the bar in `../07-system/`.

| Layer | Pick | Reason |
|---|---|---|
| Research data | yfinance, OpenBB, `poly_data`, `prediction-market-analysis` | free daily bars and prediction-market history; swap in paid feeds from `../03-data-sources/` for intraday |
| Fast research | vectorbt for parameter sweeps, Riskfolio-Lib or PyPortfolioOpt for allocation, quantstats and alphalens for reports | vectorbt Commons Clause blocks resale only, fine for internal use |
| Event-driven engine | NautilusTrader | one Rust-core engine runs the same strategy in backtest, paper and live, with IBKR, Binance, Polymarket and Kalshi adapters; LGPL allows private strategies |
| Fallback engine | LEAN | widest asset coverage and the QuantConnect cloud if local data costs run high |
| Brokers | IBKR through `ib_async` and Nautilus, Alpaca for paper US equities, Coinbase for spot crypto, Kalshi and Polymarket clients | matches the venues builders used in `../06-youtube/SYNTHESIS.md` |
| Notify layer | Telegram through `agf-tg`, plus TradingView webhooks for discretionary charts | alert-only mode first; Nautilus actors emit signals without submitting orders |
| Risk | a separate kill-switch process outside strategy code: daily loss halt, drawdown stop, broker reconciliation | the risk layer pattern every live build in the YouTube corpus shared |
| LLM layer | ai-hedge-fund style analyst agents and RD-Agent for factor ideas, kept out of the order path | LLM output feeds commentary and research queues only |

Avoid for production: backtrader (stale since 2024), mlfinlab (proprietary), Polymarket/agents (stale, order path disabled), repos with no license (read-only reference), Jesse live (paid plugin).


## Additional Cards

Cards added from topic searches and the awesome-quant and awesome-systematic-trading lists.

| Card | License | Stars | Last Push |
|---|---|---|---|
| `a-stock-data.md` | Apache-2.0 | 12,053 | 2026-11-03 |
| `a_stock_level2_data.md` | not stated | 375 | 2026-11-02 |
| `aat.md` | Apache-2.0 | 841 | 2026-07-27 |
| `adamant-tradebot.md` | none stated | 868 | 2026-11-19 |
| `ai-hedge-fund-crypto.md` | MIT License | 631 | 2025-09-05 |
| `akquant.md` | MIT | 2,645 | 2026-11-27 |
| `akshare.md` | MIT | 23,496 | 2026-11-25 |
| `aktools.md` | MIT | 1,584 | 2026-11-24 |
| `algo-trader.md` | MIT | 873 | 2023-11-20 |
| `algobot.md` | not stated | 292 | 2018-11-13 |
| `algorithmic-trading-with-python.md` | NOASSERTION | 3,535 | 2021-06-01 |
| `algotrading-ivopetiz.md` | MIT | 1,722 | 2026-01-07 |
| `alltick-realtime-forex-crypto-stock-tick-finance-websocket-api.md` | None stated | 630 | 2026-09-28 |
| `alpaca-backtrader-api.md` | Apache-2.0 | 706 | 2026-06-23 |
| `alpha-rptr.md` | MIT | 711 | 2026-06-19 |
| `alphagpt.md` | Apache-2.0 | 3,289 | 2026-06-12 |
| `alphapy.md` | Apache-2.0 | 1,791 | 2026-10-05 |
| `alphasift.md` | Apache License 2.0 | 599 | 2026-11-27 |
| `amm-arbitrageur.md` | WTFPL | 1,988 | 2022-12-07 |
| `anti-gambling-trader-tw.md` | MIT | 1,187 | 2026-11-02 |
| `ashare.md` | None stated | 3,954 | 2025-12-24 |
| `autohedge.md` | MIT | 6,743 | 2026-05-11 |
| `autotrader.md` | GPL-3.0 | 1,276 | 2025-05-04 |
| `axorderbook.md` | MIT | 424 | 2024-01-15 |
| `banbot.md` | GNU Affero General Public License v3.0 | 689 | 2026-11-27 |
| `barbotine-arbitrage-bot.md` | Other | 650 | 2026-02-04 |
| `barter-rs.md` | MIT | 2,379 | 2026-08-24 |
| `basana.md` | Apache-2.0 (listed as Other) | 878 | 2026-11-06 |
| `bbgo.md` | AGPL-3.0 | 1,682 | 2026-11-27 |
| `binance-news-sentiment-bot.md` | MIT | 1,651 | 2022-03-16 |
| `binance-triangle-arbitrage.md` | MIT | 1,173 | 2022-12-07 |
| `binance_grid_trader.md` | MIT | 997 | 2026-06-07 |
| `binance_l3_est.md` | MIT | 304 | 2026-07-12 |
| `bitcoin-arbitrage.md` | MIT | 2,588 | 2024-10-20 |
| `bitquant.md` | MIT | 1,165 | 2025-04-10 |
| `blankly.md` | LGPL-3.0 | 2,485 | 2024-12-30 |
| `bta-lib.md` | MIT | 504 | 2022-01-25 |
| `btplotting.md` | GPL-3.0 | 385 | 2025-05-04 |
| `btrader.md` | GPL-3.0 | 331 | 2021-05-30 |
| `bytex.md` | Apache License 2.0 | 302 | 2026-10-02 |
| `chronos-forecasting.md` | Apache-2.0 | 6,369 | 2026-11-27 |
| `cloddsbot.md` | MIT | 3,134 | 2026-11-13 |
| `coinbase-pro-trading-toolkit.md` | Apache-2.0 | 903 | 2020-01-16 |
| `cointrader.md` | Apache-2.0 (LICENSE file) | 451 | 2023-06-14 |
| `cointrol.md` | MIT | 1,453 | 2023-08-26 |
| `cpptrader.md` | MIT | 1,102 | 2026-11-05 |
| `crypto-arbitrage-framework.md` | None stated | 704 | 2019-09-03 |
| `crypto-signal.md` | MIT | 5,667 | 2024-07-07 |
| `cryptocurrency-arbitrage.md` | GPL-3.0 | 1,285 | 2022-05-15 |
| `curve-contract.md` | all rights reserved except per-file headers (listed Other) | 1,118 | 2025-05-29 |
| `czsc.md` | Other | 6,644 | 2026-11-08 |
| `dawp.md` | none asserted (see LICENSE.txt) | 639 | 2021-02-26 |
| `day-trader-skill.md` | MIT | 9,864 | 2026-10-20 |
| `defeatbeta-api.md` | Apache-2.0 | 809 | 2026-11-10 |
| `defi.md` | MIT License | 614 | 2024-03-02 |
| `defi-sdk.md` | LGPL-3.0 | 843 | 2026-10-15 |
| `digital-oracle.md` | MIT | 917 | 2026-07-26 |
| `dukascopy-node.md` | MIT | 992 | 2026-11-23 |
| `ea31337.md` | GPL-3.0 | 1,379 | 2026-04-07 |
| `efinance.md` | MIT | 4,189 | 2026-07-17 |
| `eiten.md` | GPL-3.0 | 3,332 | 2026-11-24 |
| `empyrical.md` | Apache-2.0 | 1,524 | 2024-07-26 |
| `eth-arbitrage.md` | not stated | 407 | 2026-03-16 |
| `example-hftish.md` | none stated | 875 | 2023-07-25 |
| `exchange-core.md` | Apache-2.0 | 2,678 | 2026-11-27 |
| `fast-trade.md` | AGPL-3.0 | 607 | 2026-10-16 |
| `fecon235.md` | NOASSERTION (LICENSE.md ships in the repo) | 1,283 | 2023-01-20 |
| `ffn.md` | MIT | 2,702 | 2026-11-19 |
| `finagg.md` | Apache-2.0 | 550 | 2026-03-22 |
| `finance-go.md` | MIT | 791 | 2023-08-07 |
| `finance-python.md` | MIT | 924 | 2024-01-01 |
| `finance.js.md` | MIT | 1,269 | 2023-03-02 |
| `financedatareader.md` | MIT | 1,581 | 2026-05-13 |
| `financial-api.md` | MIT | 4,653 | 2026-11-27 |
| `findatapy.md` | Apache-2.0 | 2,152 | 2026-07-02 |
| `finlab-ai.md` | not stated | 427 | 2026-11-27 |
| `finoptions-dev.md` | MIT | 307 | 2026-09-26 |
| `finplot.md` | MIT | 1,188 | 2026-09-24 |
| `finquant.md` | MIT | 1,849 | 2023-11-04 |
| `finta.md` | LGPL-3.0 | 2,265 | 2022-07-24 |
| `finvizfinance.md` | MIT | 1,792 | 2026-11-18 |
| `fooltrader.md` | MIT | 1,201 | 2023-05-22 |
| `fortitudo-tech.md` | GNU General Public License v3.0 | 315 | 2026-10-08 |
| `free-stockdb.md` | MIT | 3,207 | 2026-11-11 |
| `freqtrade-strategies.md` | GPL-3.0 | 5,688 | 2026-09-08 |
| `frequi.md` | GPL-3.0 | 1,130 | 2026-11-27 |
| `friestrader.md` | MIT | 322 | 2026-11-07 |
| `gekko.md` | MIT | 10,180 | 2020-02-16 |
| `gekko-strategies.md` | none | 1,447 | 2020-01-09 |
| `go-trader.md` | GPL-3.0 | 522 | 2026-06-30 |
| `godzilla-community.md` | Apache-2.0 | 393 | 2026-10-25 |
| `goex.md` | MIT | 1,998 | 2026-10-30 |
| `golang-crypto-trading-bot.md` | GPL-3.0 | 1,162 | 2026-11-26 |
| `graphvega.md` | MIT | 296 | 2021-03-03 |
| `gym-anytrading.md` | MIT | 2,389 | 2024-03-14 |
| `gym-mtsim.md` | MIT | 527 | 2024-11-14 |
| `gym-trading-env.md` | MIT | 499 | 2025-03-19 |
| `hftengine.md` | MIT | 350 | 2026-09-17 |
| `hyper-alpha-arena.md` | Apache-2.0 | 1,211 | 2026-11-03 |
| `hypergrok-trading-desk.md` | MIT License | 605 | 2026-11-26 |
| `ib_insync.md` | BSD-2-Clause | 3,277 | 2024-03-14 |
| `indicatorts.md` | MIT | 481 | 2026-11-24 |
| `investments.md` | GPL-3.0 or later | 553 | 2026-11-26 |
| `investpy.md` | MIT | 1,868 | 2026-04-13 |
| `itch.md` | Apache License 2.0 | 288 | 2021-10-22 |
| `jugaad-data.md` | None | 601 | 2026-11-21 |
| `kalshi-trading-bot-cli.md` | MIT | 416 | 2026-10-01 |
| `kelp.md` | Apache-2.0 (listed Other) | 1,123 | 2023-11-03 |
| `krypto-trading-bot.md` | Other | 3,736 | 2024-12-15 |
| `lag-llama.md` | Apache-2.0 | 1,603 | 2025-06-06 |
| `learn_backtrader.md` | none stated | 2,310 | 2021-10-21 |
| `limit-order-book.md` | MIT | 315 | 2026-10-19 |
| `live-sports-arbitrage-bet-finder.md` | not stated | 298 | 2023-11-25 |
| `lppls.md` | MIT | 482 | 2026-05-30 |
| `lse-data.md` | MIT | 357 | 2026-11-26 |
| `machinelearningstocks.md` | MIT | 1,972 | 2024-06-17 |
| `maverick-mcp.md` | MIT | 737 | 2026-11-13 |
| `metatrader5-experts.md` | MIT | 711 | 2025-11-15 |
| `microrealestate.md` | Other (custom LICENSE.md) | 1,246 | 2026-11-18 |
| `money-legos.md` | MIT | 1,027 | 2024-12-09 |
| `moonshot.md` | Apache-2.0 | 300 | 2026-10-28 |
| `mytt.md` | None stated | 2,896 | 2026-06-13 |
| `ninjabot.md` | MIT | 1,636 | 2026-11-01 |
| `node-binance-trader.md` | MIT | 1,225 | 2024-08-19 |
| `nof0.md` | none | 2,755 | 2025-12-07 |
| `nothing-ever-happens.md` | CC0-1.0 | 979 | 2026-04-13 |
| `nsetools.md` | MIT | 910 | 2025-03-18 |
| `open-trading-api.md` | none | 1,682 | 2026-11-24 |
| `opentrader.md` | Apache-2.0 | 2,952 | 2025-06-29 |
| `optimalportfolio.md` | MIT | 375 | 2024-02-27 |
| `optionlab.md` | GPL-3.0 | 593 | 2026-11-26 |
| `options-implied-probability.md` | Apache License 2.0 | 356 | 2026-04-29 |
| `optlib.md` | MIT | 1,644 | 2022-11-18 |
| `optopsy.md` | AGPL-3.0 | 1,528 | 2026-11-27 |
| `oracle3-prediction-market-agent.md` | Apache-2.0 | 573 | 2026-11-25 |
| `order-book-heatmap.md` | BSD-2-Clause | 525 | 2021-03-09 |
| `oskhquant.md` | NOASSERTION | 1,704 | 2026-10-19 |
| `pairs-trading-with-python.md` | none stated | 858 | 2024-04-01 |
| `pandas_market_calendars.md` | MIT | 1,011 | 2026-11-26 |
| `pandas_talib.md` | MIT | 783 | 2018-05-30 |
| `panwatch.md` | MIT | 2,576 | 2026-11-26 |
| `paperbroker.md` | MIT | 282 | 2018-04-08 |
| `peregrine.md` | MIT | 1,249 | 2021-06-28 |
| `polybot.md` | MIT | 1,063 | 2026-02-20 |
| `polymarket-mcp-server.md` | MIT | 755 | 2026-11-25 |
| `polymarket-paper-trader.md` | MIT | 506 | 2026-11-01 |
| `polyterm.md` | MIT | 370 | 2026-10-14 |
| `portfolio-optimization.md` | Apache-2.0 | 511 | 2026-11-23 |
| `prediction-market.md` | Modified MIT with Commons Clause (listed Other) | 1,108 | 2026-11-27 |
| `prediction-markets-trading-bot-toolkits.md` | MIT | 540 | 2026-11-24 |
| `protocol.md` | GPL-3.0 (Enzyme Foundation may relicense internally) | 561 | 2026-09-25 |
| `pumpfun-bonkfun-bot.md` | Apache-2.0 | 1,103 | 2026-11-25 |
| `pybacktest.md` | MIT | 825 | 2021-11-11 |
| `pycryptobot.md` | Apache-2.0 | 2,061 | 2026-03-26 |
| `pylivetrader.md` | Apache-2.0 | 685 | 2022-10-04 |
| `pynance.md` | MIT | 489 | 2021-02-03 |
| `pyql.md` | NOASSERTION (a LICENSE.txt file ships in the repo) | 1,358 | 2026-07-17 |
| `pysystemtrade-examples.md` | not stated | 281 | 2018-02-21 |
| `pytrendfollow.md` | MIT | 474 | 2018-04-25 |
| `q-fin.md` | MIT | 683 | 2023-10-31 |
| `qsx-strategy-score.md` | MIT | 930 | 2026-10-25 |
| `qtpylib.md` | Apache-2.0 | 2,271 | 2021-09-22 |
| `qtrader.md` | not stated | 549 | 2026-09-07 |
| `quant.md` | FMIT (Feedback MIT License, copyright 2014 Paul O. Perry) | 462 | 2015-07-14 |
| `quant-mind.md` | MIT | 3,144 | 2026-08-15 |
| `quantdom.md` | Apache-2.0 | 777 | 2022-07-06 |
| `quantdsl.md` | BSD 3-Clause (LICENSE file) | 386 | 2018-04-14 |
| `quantfinance.md` | CC BY-NC 4.0 (listed NOASSERTION) | 625 | 2025-09-02 |
| `quantfinancebook.md` | BSD-3-Clause | 997 | 2025-04-14 |
| `quantgpt.md` | MIT | 522 | 2026-11-23 |
| `quantjourney-bt.md` | Apache-2.0 | 723 | 2026-11-04 |
| `quantmath.md` | MIT | 412 | 2023-06-16 |
| `quantmod.md` | GPL-3.0 | 909 | 2026-11-22 |
| `quantmuse.md` | MIT | 3,043 | 2025-07-29 |
| `quantpy.md` | BSD-4-Clause | 1,086 | 2023-05-25 |
| `quantresearch.md` | MIT | 3,079 | 2023-08-26 |
| `quantsbin.md` | MIT | 664 | 2026-11-18 |
| `quantstrat.md` | GPL-3 | 310 | 2023-09-14 |
| `quanttrader.md` | Apache-2.0 | 788 | 2024-06-20 |
| `rango-client.md` | Apache-2.0 | 1,123 | 2026-11-26 |
| `rateslib.md` | dual: source-available non-commercial (`LICENCE`) or paid commercial subscription (`COMMERCIAL_LICENCE`) | 372 | 2026-05-20 |
| `real-estate-mcp.md` | MIT | 381 | 2026-07-18 |
| `risk-aware-trading-agents.md` | MIT | 484 | 2026-11-26 |
| `risk_engine.md` | Apache License 2.0 | 678 | 2026-07-07 |
| `riskparity-py.md` | MIT | 327 | 2026-08-31 |
| `robin-stocks.md` | MIT | 2,131 | 2026-02-11 |
| `rockyzsu-stock.md` | BSD-3-Clause | 9,152 | 2026-04-17 |
| `roq-api.md` | MIT | 518 | 2026-11-27 |
| `seaprotocol.md` | Other | 5,025 | 2026-03-02 |
| `skfolio.md` | BSD-3-Clause | 2,678 | 2026-11-27 |
| `smartinvest.md` | MIT | 460 | 2021-09-13 |
| `socktrader.md` | GPL-3.0 | 474 | 2023-12-01 |
| `solana-jupiter-bot.md` | MIT | 790 | 2024-02-14 |
| `solana-mev-agent-py.md` | MIT | 299 | 2024-09-06 |
| `spectre.md` | GPL-3.0 | 970 | 2026-11-05 |
| `stock.md` | Apache-2.0 | 15,401 | 2026-04-02 |
| `stock-analysis-engine.md` | Apache-2.0 (LICENSE file; the GitHub metadata field is blank) | 1,248 | 2020-09-05 |
| `stock-pattern.md` | GPL-3.0 | 420 | 2025-12-02 |
| `stockrl.md` | GPL-3.0 | 365 | 2024-03-27 |
| `stocks.md` | Apache-2.0 | 380 | 2026-07-10 |
| `support_resistance.md` | not stated | 477 | 2023-07-06 |
| `tai.md` | MIT | 499 | 2024-12-07 |
| `tda-api.md` | MIT | 1,323 | 2024-06-16 |
| `tf-quant-finance.md` | Apache-2.0 | 5,584 | 2026-08-06 |
| `the0.md` | Apache-2.0 | 440 | 2026-11-15 |
| `tickdb-unified-realtime-marketdata-api.md` | MIT | 943 | 2026-11-06 |
| `tickflow-stock-panel.md` | MIT | 381 | 2026-08-31 |
| `tickgrinder.md` | MIT | 591 | 2019-12-09 |
| `tiingo-python.md` | MIT | 320 | 2025-12-14 |
| `time-series-forecasting-pytorch.md` | Apache License 2.0 | 332 | 2024-04-21 |
| `timecopilot.md` | MIT | 643 | 2026-11-18 |
| `tossinvest-cli.md` | MIT | 523 | 2026-11-23 |
| `trade-frame.md` | NOASSERTION | 685 | 2026-10-13 |
| `trader.md` | Apache-2.0 | 8,482 | 2026-02-28 |
| `trading-backtest.md` | MIT | 353 | 2026-11-09 |
| `trading-server.md` | GNU General Public License v3.0 | 679 | 2023-07-06 |
| `tradingagents-astock.md` | Apache-2.0 | 4,021 | 2026-10-30 |
| `tradingview-api.md` | None stated | 5,961 | 2026-11-14 |
| `tradingview-screener.md` | MIT | 1,374 | 2026-11-26 |
| `tribeca.md` | Other | 4,115 | 2021-12-08 |
| `trump-code.md` | MIT | 811 | 2026-11-26 |
| `ttr.md` | GPL-2.0 | 351 | 2026-02-28 |
| `tushare.md` | BSD-3-Clause | 15,512 | 2024-03-13 |
| `uni2ts.md` | Apache-2.0 | 1,634 | 2026-06-02 |
| `uniswap-arbitrage-analysis.md` | none | 2,121 | 2025-12-11 |
| `uniswap-python.md` | MIT | 1,018 | 2026-11-26 |
| `uniswap-sushiswap-arbitrage-bot.md` | MIT License | 608 | 2021-12-30 |
| `visualhft.md` | Apache-2.0 | 1,227 | 2026-11-26 |
| `volatility-trading.md` | GPL-3.0 | 1,972 | 2024-10-21 |
| `wagerbrain.md` | MIT | 322 | 2020-05-02 |
| `wallstreet.md` | MIT | 1,725 | 2024-07-06 |
| `waykichain.md` | MIT | 1,046 | 2022-11-30 |
| `whirlpools.md` | Orca License (Apache-2.0 until 2025-02-26, then non-commercial terms with a consent requirement for commercial use) | 570 | 2026-11-03 |
| `willowtree.md` | MIT | 392 | 2018-07-14 |
| `wolfbot.md` | AGPL-3.0 | 791 | 2023-02-17 |
| `xad.md` | AGPL-3.0 | 446 | 2026-11-25 |
| `xalpha.md` | MIT | 2,756 | 2026-11-14 |
| `yahooquery.md` | MIT | 921 | 2025-05-15 |
| `zeus-options-terminal.md` | Other (PolyForm Noncommercial 1.0.0) | 351 | 2026-11-26 |
