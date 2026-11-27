# Financial Data Sources

Bead `bkt-q5moa`. Every row comes from a provider page fetched on 2026-11-27. `n/s` means the fetched page did not state it. `unverified` means the page failed to load (403, 404, timeout or login wall); check those rows by hand before you buy or build on them. Prices are list prices as seen that day.

## Equities and ETFs

| Name | URL | Assets | History | Granularity | Survivorship | License | Price 2026-11-27 | API/format |
|---|---|---|---|---|---|---|---|---|
| Norgate Data | norgatedata.com | US, AU, CA stocks, futures, FX | US 10 yrs on Silver, back to 1950 on Diamond | Daily EOD | Delisted included | n/s | US stocks 12 months: Silver $270, Gold $360, Diamond $787.50; 6 months $148.50, $198, $433.13; 3-week trial | Desktop updater, AmiBroker, Python package |
| FirstRate Data | firstratedata.com | Stocks, ETFs, futures, indices, FX, crypto, options | Stocks 2000, futures 2008, FX 2010 | 1m, 5m, 30m, 1h, 1d, some tick | 7,000+ delisted stocks, partial before 2022 | Commercial use and derivative works allowed; raw data redistribution barred | One-time purchase; updates $59 to $119/mo per bundle or about $99/yr per ticker | Zipped CSV |
| Polygon.io / Massive | massive.com/pricing | US stocks, financials | 20+ yrs on Stocks Advanced | Custom bars by multiplier and timespan, pre and after hours | Delisted tickers listed via All Tickers with active=false | Individual use; business priced apart | $29/mo Financials, $199/mo Stocks Advanced; $49/mo NYSE Order Imbalances | REST, WebSocket |
| Databento | databento.com/docs/venues-and-datasets | 37 datasets: US equities (Nasdaq ITCH, NYSE Pillar, Cboe, IEX, MEMX), CME Globex, ICE, Eurex futures, OPRA options, reference data | n/s | Schemas MBO, MBP-10, MBP-1, TBBO, BBO, trades, OHLCV, definitions, statistics | n/s | n/s | Usage credits, amount unverified | API |
| Tiingo | tiingo.com/about/pricing | Equities, fundamentals, IEX feed, crypto, news | 30+ yrs prices; fundamentals 5 yrs Starter, 15+ Power | EOD composite, IEX intraday | n/s | Internal use only: no display or sharing; redistribution priced apart | Free; $30/mo or $300/yr; $50/mo or $499/yr internal commercial | REST |
| Alpaca | docs.alpaca.markets | US stocks, ETFs, options | 2016 on | n/s | n/s | n/s | Free IEX feed; $99/mo Algo Trader Plus | REST, WebSocket |
| Interactive Brokers | interactivebrokers.github.io/tws-api | Stocks, futures, options, FOPs, warrants | Bars of 30s or less limited to 6 months; expired futures 2 yrs past expiry | 1s to 1 month bars | Delisted securities unavailable | Account and TWS or IB Gateway needed | n/s | TWS API (Python, Java, C++, C#, VB) |
| QuantConnect | quantconnect.com/pricing | Equity, index, FX, crypto, futures, options | n/s | Minute, hour, daily on all tiers; tick and second on paid tiers only | n/s | Cloud use | Free tier; downloads $1 per 100 QCC, $10 minimum | LEAN cloud |
| EODHD | eodhd.com/pricing | Global EOD (150,000+ tickers), fundamentals, intraday | EOD 30+ yrs; US 1m 2004; tick 2008; fundamentals 1985 | EOD, intraday, tick | n/s | Personal and Commercial plans; academic licence | Free 20 calls/day; $19.99/mo EOD; $29.99/mo with intraday; $99.99 all-in-one | REST JSON, CSV |
| Sharadar | sharadar.com/subscribe | US fundamentals, EOD stock and fund prices | Delisted coverage back to the 1990s | EOD, fundamentals | Delisted included; near free of survivorship bias | Personal Use License; commercial by email | Bundle $29/mo 5 yrs, $49 10 yrs, $69 full history; $499/yr full; free tier for 30 Dow stocks | REST via Nasdaq Data Link |
| Intrinio | intrinio.com/pricing | US equities, options, fundamentals | EOD 50+ yrs; fundamentals 2006 | Tick, 1m, EOD | n/s | Personal; Startup tier commercial with display rights | $150/mo Individual; Startup from $333/mo; Enterprise from $1,250/mo | REST |
| Kibot | kibot.com/buy.aspx | US stocks, ETFs, futures, FX, OTC | Daily 1962; 1m 1998; tick 2009 | Tick to EOD | Not addressed on the page | Download access lasts 1 yr from last purchase; files kept | From $19; $139/mo Premium (4 yrs of minute history); bundles $990 to $4,800 | Text files, API, FTP |
| Alpha Vantage | alphavantage.co/premium | US market data, options, index history | n/s | n/s | n/s | n/s | Free 25 req/day; $49.99/mo for 75 req/min up to $249.99 for 1,200 | REST |
| Yahoo via yfinance | pypi.org/project/yfinance | Quotes, history, news, screeners, sectors | n/s | n/s | Delisted tickers drop out | Library Apache-2.0; Yahoo data personal use | Free | Python |
| Stooq | stooq.com/db/h | n/s | n/s | Daily, hourly, 5m | n/s | n/s | Free | Bulk files |
| Financial Modeling Prep | site.financialmodelingprep.com/pricing-plans | US (Starter), UK and Canada (Premium), global (Ultimate); fundamentals, ratios, forex, crypto | 5 yrs Starter, 30+ yrs Premium | EOD; intraday on Premium; 1m on Ultimate | n/s | Display or redistribution needs a licensing agreement | Free 250 calls/day; $29/mo Starter; $69 Premium; $139 Ultimate; lower on annual billing | REST |
| LSEG Workspace | lseg.com | Multi-asset | n/s | n/s | n/s | Enterprise | Quote only | Desktop, API |
| Bloomberg Terminal, B-PIPE | bloomberg.com/professional | unverified | unverified | unverified | unverified | unverified | unverified | Terminal, BLPAPI |

## Options

| Name | URL | Assets | History | Granularity | Survivorship | License | Price 2026-11-27 | API/format |
|---|---|---|---|---|---|---|---|---|
| ORATS | orats.com/data-api | US options | EOD 2007; 1m Aug 2020; tick Sep 2022 | EOD, 1m, tick | n/s | n/s | $199/mo delayed API; free samples | REST |
| OptionMetrics IvyDB | optionmetrics.com | US equity and index options | 1996 on | EOD with IV, greeks | n/s | Institutional | Contact sales | Delivered DB, also on WRDS |
| Cboe DataShop | datashop.cboe.com | US options | n/s | Trades, 1m quotes, EOD, 15:45 snapshot | n/a | n/s | n/s | File purchase |
| Intrinio options | intrinio.com/pricing | US options | EOD 2 yrs | EOD | n/s | See above | In $150/mo plan | REST |

## Futures

| Name | URL | Assets | History | Granularity | Survivorship | License | Price 2026-11-27 | API/format |
|---|---|---|---|---|---|---|---|---|
| CME DataMine | cmegroup.com/market-data/datamine-historical-data.html | unverified | unverified | unverified | unverified | unverified | unverified | unverified |
| Norgate, FirstRate, Kibot | see equities | Futures | FirstRate 2008 | 1m to daily | Expired contracts n/s | n/s | See equities | Files |
| CFTC Commitments of Traders | cftc.gov/MarketReports/CommitmentsofTraders | Positions by trader class | Legacy 1986; Disaggregated, TFF 2006 | Weekly | Never revised | Public | Free | CSV, TXT, API |

## FX

| Name | URL | Assets | History | Granularity | Survivorship | License | Price 2026-11-27 | API/format |
|---|---|---|---|---|---|---|---|---|
| TrueFX | truefx.com | FX majors | n/s | Tick, top of book | n/a | n/s | Free with registration | Downloads |
| HistData.com | histdata.com | 55 FX pairs and metals, WTI, Brent, 10 index CFDs | n/s | M1, some tick | n/a | Free, no warranty | Free; $7/mo auto-update; $27 one-off FTP | Zipped CSV by pair, year and month, MT4/5 |
| OANDA v20 | developer.oanda.com | FX, CFD | n/s | 5s to monthly | n/a | Account needed | n/s | REST |
| Dukascopy | dukascopy.com/swiss/english/marketwatch/historical | Forex, commodities, indices | unverified | Tick to monthly | n/a | unverified | Free export tool | CSV |

## Bonds and Rates

| Name | URL | Coverage | History | Granularity | Revisions | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| US Treasury yield curve | home.treasury.gov interest-rate-statistics | Par nominal and real curves | Real 2004 on | Daily | n/s | US government | Free | Text view, XML |
| FINRA TRACE | finra.org/filing-reporting/trace/data | Corporate, agency, structured, Treasury aggregates | Historical and Enhanced files exist | Trade level | n/s | Vendor agreement | Paid, price not shown; free non-commercial views | Vendor feeds, FINRA API |
| CRSP Treasuries | WRDS | US Treasuries | 1916 on | Daily, monthly | n/s | Institutional | Not shown | WRDS |
| FRED | fred.stlouisfed.org | Rates, spreads, curves | Per series | Per series | ALFRED vintages | Per series | Free | REST with key |

## Macro

| Name | URL | Coverage | History | Granularity | Revisions | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| FRED / ALFRED | fred.stlouisfed.org/docs/api/fred | US and global series | Per series | Per series | Vintages via `series/vintagedates` | Per series terms | Free | REST |
| BIS Data Portal | data.bis.org | Banking, credit, property prices, EER, debt securities | n/s | Monthly, quarterly | n/s | BIS terms | Free | SDMX API, bulk |
| IMF Data | data.imf.org | WEO, COFER, CPI, fiscal | n/s | Country | Dated releases | IMF terms | Free | IMF API |
| World Bank WDI | datacatalog.worldbank.org | 1,500+ indicators, 200+ economies | 1960 to 2025 | Annual | n/s | CC BY 4.0 | Free | API |
| OECD Data Explorer | data-explorer.oecd.org | 1,553 dataflows in the public SDMX catalog | n/s | Per dataflow | n/s | n/s | n/s | SDMX REST at sdmx.oecd.org/public/rest |
| EIA | eia.gov/opendata | Electricity, gas, petroleum, coal, STEO, AEO | Per series | Per series | n/s | API Terms of Service and Copyrights and Reuse Policy | Free, key in URL | JSON default, 5,000 rows per call; XML 300 rows; bulk ZIP |

## Commodities

| Name | URL | Coverage | History | Granularity | Revisions | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| World Bank Pink Sheet | worldbank.org/en/research/commodity-markets | Commodity prices | n/s | Monthly, annual | n/s | CC BY | Free | XLS, PDF |
| LME historical | lme.com | LME contracts | Current year free, older paid | Daily | n/s | No redistribution | $85 standard, $470 premium per contract per year | Excel via LME Portal |
| EIA | see macro | Energy | | | | | Free | |
| CFTC COT | see futures | Positioning | | | | | Free | |

## Fundamentals and Filings

| Name | URL | Coverage | History | Granularity | Revisions | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| SEC XBRL APIs | sec.gov edgar-application-programming-interfaces | companyfacts, companyconcept, frames | 2009 on | Per fact | As filed | Public | Free, no key | JSON, nightly bulk ZIP |
| SEC Financial Statement Data Sets | sec.gov financial-statement-data-sets | Face statements | 2009Q1 to 2026Q3 | Quarterly ZIP | As filed | Public | Free | Flat tables |
| SEC EDGAR full-text search | efts.sec.gov/LATEST/search-index | All filing text | 2001 on | Per document | n/a | Public | Free | JSON |
| Compustat | WRDS | NA, Global, Bank fundamentals | PIT 1980; unrestated quarterly 1982 | Daily to annual | PIT and unrestated sets | Institutional | Not shown | WRDS |

## Academic and Long History

| Name | URL | Coverage | History | Granularity | Survivorship | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| CRSP | WRDS | US stocks, indexes, Treasuries, funds | Stocks 1923 | Daily, monthly | Funds survivor-bias-free; stock delisting returns in CRSP | Institutional | Not shown | WRDS |
| Ken French Data Library | mba.tuck.dartmouth.edu | FF 3 and 5 factors, sorted portfolios | n/s | Daily, monthly | Revisions logged | Copyright Fama-French | Free | CSV zips |
| Shiller data | shillerdata.com | S&P price, dividends, earnings, CAPE, home prices | Stocks 1871, homes 1890 | Monthly | n/s | Disclaimer | Free | XLS |
| Global Financial Data | globalfindata.com | 65,000+ series, 200+ countries | Claims 1,000+ yrs | n/s | n/s | Institutional | Contact form | n/s |
| JST Macrohistory | macrohistory.net/database | 18 economies, 48 variables | 1870 on | Annual | Release 6 | CC BY-NC-SA 4.0 | Free | DTA, XLSX |

## Real Estate and Land

| Name | URL | Coverage | History | Granularity | Revisions | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| Zillow ZHVI | zillow.com/research/data | Typical home value | Public CSVs start 2000-03-31 | Monthly, metro to zip | History recomputed on method change | unverified | Free | CSV |
| Case-Shiller via FRED | fred.stlouisfed.org/series/CSUSHPINSA | US national and metros | Latest Sep 2026 | Monthly | n/s | S&P copyright, reuse needs approval | Free to view | FRED API |
| Redfin Data Center | redfin.com/news/data-center | Prices, sales, delistings, migration | n/s | Weekly, monthly | n/s | Redfin ToU | Free | Downloads |
| FHFA HPI | fhfa.gov/data/hpi | Repeat-sales on GSE loans | 1975 on | National, division, state, metro, county, ZIP, tract | n/s | No terms stated on page | Free | Downloads; monthly and quarterly releases |
| USDA NASS land values | esmis.nal.usda.gov/concern/publications/pn89d6567 | Farm real estate, cropland, pasture per acre | n/s | Annual; latest release 2026-07-31 | n/s | Public | Free | State and 10 economic regions |
| Lincoln Institute land prices | lincolninst.edu/data | Land and Property Values in the U.S.: land, structure and housing indices, 46 metros; not listed on the data index fetched 2026-11-27 | National quarterly 1975 on, annual 1930 on; metros 1985 on | Quarterly, annual | n/s | unverified | unverified | unverified |

## Mortgage-Backed Securities

| Name | URL | Coverage | History | Granularity | Revisions | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| Fannie Mae Single-Family Loan Performance | capitalmarkets.fanniemae.com | 30-yr fixed conventional loans | Acquisitions 2000 on | Loan-month | Quarterly updates | Signup terms | Free, registration | Headerless CSV via Data Dynamics |
| Freddie Mac Single-Family Loan-Level | freddiemac.com/research/datasets/sf-loanlevel-dataset | About 56M loans with loss fields | Originations 1999 to June 2026 | Loan-month | Unaudited, may change | Free non-commercial; commercial license | Free, registration | Yearly files via Clarity |

## Private Business Sale Comps

| Name | URL | Coverage | History | Granularity | Bias | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| BizBuySell Insight Report | bizbuysell.com/insight-report | Broker-reported SME sales | Quarterly reports 2021 to 2026 seen | Quarterly, US | Voluntary reporting, incomplete | unverified | Free | Report pages |

## Crypto

| Name | URL | Coverage | History | Granularity | Survivorship | License | Price 2026-11-27 | API/format |
|---|---|---|---|---|---|---|---|---|
| Coinbase Advanced Trade candles | docs.cdp.coinbase.com | Coinbase spot | n/s | 1m to 1d, 350 per call | n/s | Coinbase terms | Free, no auth | REST |
| Binance public data | github.com/binance/binance-public-data | Spot, USD-M, COIN-M klines, trades | Daily and monthly files | 1s to 1mo | n/s | MIT repo; data under separate T&C | Free | Zipped CSV with checksums; daily files next day, monthly files first Monday |
| Kraken OHLCVT | support.kraken.com/articles/360047124832 | Every Kraken pair | First trade to 2026-09-30, quarterly | 1m to 1d | n/s | Kraken ToS | Free | Headerless CSV ZIP |
| CoinGecko | coingecko.com/en/api/pricing | Coins, DEX pools | Daily 2013, hourly 2018 on Analyst+ | Daily, hourly | n/s | No redistribution below Enterprise | $0, $35, $129, $499, $999/mo | REST |
| Tardis.dev | tardis.dev | 50+ exchanges, L2, L3, trades, options | 7+ yrs | Tick | n/s | Commercial | $350 to $6,000/mo; free samples | gz CSV, HTTP, WS |
| Kaiko | kaiko.com | CeFi, DeFi, derivatives | n/s | L2 | n/s | Licensed | Contact sales | API |
| CoinMetrics | kb.talostrading.com/coinmetrics | Onchain and market, reference rates | Community tier limited; Atlas 30 days, reference rates last 7 points at fine resolution | n/s | n/s | CC BY-NC 4.0 on community data | Community free, 10 requests per 6 s per IP, no key; Pro contact sales | API v4 |
| Glassnode | studio.glassnode.com/pricing | Onchain metrics | 4 yrs Advanced, 15+ Professional | 24h to 10m | n/s | n/s | $49/mo; Professional from $584/mo; API add-on | Studio, REST |
| Dune | dune.com/pricing | Multichain SQL | Chain genesis | Raw rows | n/a | n/s | Free tier; paid prices not shown | REST, SDKs |
| Kaggle crypto dumps | kaggle.com/datasets | BTC 1m from Jan 2012 (CC BY-SA 4.0); top coins daily (CC0); Binance 1m for 2,121 pairs, 28 GB (licence in description) | Per dataset | 1m to daily | n/s | Per dataset: CC0, CC BY-SA 4.0 or other | Free | CSV, BigQuery |

## Stablecoin Flows

| Name | URL | Coverage | History | Granularity | Survivorship | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| DefiLlama stablecoins | api-docs.defillama.com | Supply per coin and chain | n/s | n/s | n/s | n/s | Free, rate limited; Pro key | REST |
| Visa Onchain Analytics | visaonchainanalytics.com | Supply, transactions, addresses on ETH, SOL, Tron | All time | n/s | n/s | n/s | Free dashboard | No API seen |
| Artemis | about.artemis.ai/pricing | Investment research platform with research, SQL and charts | n/s | n/s | n/s | n/s | Investor tier $0 | Terminal, no API seen |

## Prediction Markets

| Name | URL | Coverage | History | Granularity | Resolved markets | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| Polymarket Gamma and CLOB | docs.polymarket.com | Markets, events, price history | n/s | 1m default | Kept, `closed=true` | n/s | Free, no auth | REST |
| Kalshi | docs.kalshi.com | Markets, trades, candles | Rolling cutoff via `/historical/cutoff` | 1m, 1h, 1d | Kept in `/historical/markets` | n/s | n/s | REST, cursor pages |

## Sports Betting Odds

| Name | URL | Coverage | History | Granularity | Survivorship | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| The Odds API | the-odds-api.com/liveapi/guides/v4 | Bookmaker odds | 2020-06-06 on | 10m, 5m from Sep 2022 | n/s | n/s | Free 500 credits; $30, $59, $119, $249/mo; history paid | REST |
| SportsDataIO | sportsdata.io/historical-odds | Pregame, in-play, props, futures | Lines 2019, props 2020 | n/s | n/s | Commercial | Contact sales | API, S3 bulk |
| OddsPortal | oddsportal.com | Closing odds, many sports | n/s | Closing | n/a | Site ToS | Free site | No API |

## GPU Compute Pricing

| Name | URL | Coverage | History | Granularity | Survivorship | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| Silicon Data SDH100RT | silicondata.com/products/silicon-index/h100 | H100 rental index | Public table from 2026-10-28; claims 8 yrs | Daily | n/a | All rights reserved | Index $3.07/GPU-hr on 2026-11-26; data via sales | Portal, API, Bloomberg, Refinitiv |
| Ornn OCPI | ornn.com | Realized prices H100, H200, B200, B300, A100 | n/s | Hourly | n/a | n/s | Contact sales | docs.ornn.com |
| SF Compute | sfcompute.com | GPU marketplace: VMs, bare metal, managed Slurm, resale of reserved capacity | unverified | unverified | n/a | unverified | Homepage example $3.00 reserved, $4.29 realized per GPU-hr | sf CLI, docs.sfcompute.com |
| Vast.ai | docs.vast.ai search-offers | Live offers | Current only | Per offer | n/a | Vast ToS | Free with key | REST; snapshot it to build history |

## Alternative Data

| Name | URL | Coverage | History | Granularity | Survivorship | License | Price | API/format |
|---|---|---|---|---|---|---|---|---|
| Quiver Quantitative | quiverquant.com/pricing | Congress trades, lobbying, insiders, WARN | n/s | n/s | n/a | n/s | Not listed | API |
| Thinknum | thinknum.com | Jobs, stores, pricing on 450k+ companies | n/s | n/s | n/s | Commercial | Contact sales | Web, API |
| SimilarWeb | similarweb.com/corp/pricing | Web traffic | 37 months | Daily | n/a | Commercial | Custom | API |
| Google Trends API | developers.google.com/search/apis/trends | Search interest | Rolling 5 yrs | Day to year | n/a | Alpha | By application | API |

## Start Free Stack

| Need | Source |
|---|---|
| US daily equities, research grade | Ken French factors, Shiller monthly, Stooq and Tiingo free for prices; accept survivorship bias until Norgate |
| Fundamentals | SEC XBRL companyfacts and Financial Statement Data Sets |
| Macro and rates | FRED with ALFRED vintages, Treasury curve, BIS, World Bank, IMF, JST |
| Crypto | Binance public data, Kraken OHLCVT, Coinbase candles |
| Prediction markets | Polymarket and Kalshi APIs, both keep resolved markets |
| Real estate and MBS | Zillow ZHVI, FHFA HPI, Case-Shiller via FRED, Fannie and Freddie loan-level |
| Commodities and positioning | World Bank Pink Sheet, EIA, CFTC COT |
| FX | HistData, TrueFX |
| GPU pricing | Snapshot Vast.ai offers hourly into a local table; record Silicon Data public index daily |

## First Paid Purchases

| Order | Purchase | Cost seen 2026-11-27 | Reason |
|---|---|---|---|
| 1 | Norgate Data US stocks | Price n/s; 3-week trial | Delisted stocks and index membership history; removes survivorship bias from equity backtests |
| 2 | Massive Stocks Advanced or Tiingo Power | $199/mo or $30/mo | Intraday US history 20+ yrs and a live feed |
| 3 | ORATS delayed API | $199/mo | Options EOD from 2007 with IV and greeks |
| 4 | The Odds API historical | $30/mo entry | Sports odds history from 2020 at 10m |

Hold on Tardis.dev ($350/mo minimum), Glassnode Professional ($584/mo) and WRDS until a strategy needs tick crypto, onchain or CRSP-grade research. University WRDS access covers CRSP, Compustat and OptionMetrics at no direct cost.
