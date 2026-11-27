# The Full Map: Atlas of Finance

Bead `bkt-q5moa`. As of 2026-11-27.

Finance is a ledger of promises: who owes what to whom, when, and in which unit. The map runs from the unit of account at the bottom, through the assets people hold, the markets that price them, the math that models them, the data that feeds the math, the schooling that teaches it, and the systems that settle it.

Every node is a coverage unit with a stable ID. Evidence grades follow `quantum/evidence/SCHEMA.md`: **A** primary data or statute, **B** reputable secondary reporting, **C** single source or memory pending a primary check. Folder column gives the chapter.

## Layer 0: Money

| Node | What | ID | Folder |
|---|---|---|---|
| Barter and credit ledgers | Debt tallies predate coins; Mesopotamian clay ledgers | `M-ledger` | 01 |
| Commodity money | Grain, cattle, shells, metal by weight | `M-commodity` | 01 |
| Coinage | Lydian electrum, c. 630 BCE onward | `M-coin` | 01 |
| Banking and bills of exchange | Medici, goldsmith notes, fractional reserves | `M-bank` | 01 |
| Central banking | Riksbank 1668, Bank of England 1694, Fed 1913 | `M-cb` | 01 |
| Gold standard | 1821 to 1914 classical era, interwar collapse | `M-gold` | 01 |
| Bretton Woods | 1944 dollar-gold peg, ended 1971 | `M-bw` | 01 |
| Fiat money | Floating rates since 1973 | `M-fiat` | 01 |
| Eurodollar | Offshore dollar credit since the 1950s | `M-euro` | 01 |
| Shadow banking and 2008 | MBS, repo, the run on wholesale funding | `M-2008` | 01 |
| Bitcoin and crypto | Bearer digital asset, 2009 | `M-crypto` | 01 |
| Stablecoins | Tokenized dollar claims; GENIUS Act 2025 | `M-stable` | 01 |
| CBDCs | e-CNY, digital euro, US anti-CBDC stance | `M-cbdc` | 01 |
| Inflation and purchasing power | CPI, debasement, real versus nominal | `M-inflation` | 01 |

## Layer 1: Assets

| Node | ID | Folder |
|---|---|---|
| Public equities | `A-stocks` | 02 |
| Government and corporate bonds | `A-bonds` | 02 |
| Mortgages and MBS | `A-mbs` | 02 |
| Residential and commercial real estate | `A-realestate` | 02 |
| Land | `A-land` | 02 |
| Farmland | `A-farmland` | 02 |
| Private businesses and private equity | `A-private` | 02 |
| Commodities and gold | `A-commodities` | 02 |
| Foreign exchange | `A-fx` | 02 |
| Crypto assets | `A-crypto` | 02 |
| Stablecoin yield | `A-stableyield` | 02 |
| Prediction markets | `A-predict` | 02 |
| Sports trading | `A-sports` | 02 |
| GPUs and compute | `A-compute` | 02 |
| Art and collectibles | `A-art` | 02 |
| Cash and T-bills | `A-cash` | 02 |
| Private credit | `A-privcredit` | 02 |
| Insurance-linked and annuities | `A-insurance` | 02 |

## Layer 2: Markets and Plumbing

| Node | What | ID |
|---|---|---|
| Exchanges and market structure | NYSE, Nasdaq, CME, ATS, PFOF | `K-exchange` |
| Clearing and settlement | DTCC, T+1 since May 2024, CCPs | `K-clearing` |
| Repo and money markets | SOFR, reverse repo, money funds | `K-repo` |
| Derivatives | Futures, options, swaps, CDS | `K-deriv` |
| FX market | $9.6T daily turnover (BIS Triennial 2025) | `K-fx` |
| Onchain markets | AMMs, DEX order books, perps | `K-onchain` |
| Payments rails | ACH, FedNow, SWIFT, cards, x402 | `K-payments` |
| Regulators | SEC, CFTC, OCC, Fed, FDIC, state AGs and gaming boards | `K-regulators` |

## Layer 3: Quant

| Node | What | ID |
|---|---|---|
| Time value and discounting | NPV, IRR, duration | `Q-tvm` |
| Portfolio theory | Markowitz 1952, CAPM, efficient frontier | `Q-mpt` |
| Factor models | Fama-French, momentum, quality | `Q-factors` |
| Option pricing | Black-Scholes-Merton 1973, volatility surface | `Q-options` |
| Kelly and position sizing | Log-optimal growth; bankroll math for prediction markets | `Q-kelly` |
| Risk | VaR, drawdown, fat tails, liquidity risk | `Q-risk` |
| Market microstructure | Spreads, order flow, market making | `Q-micro` |
| Backtesting and overfitting | Deflated Sharpe, data snooping | `Q-backtest` |
| ML in finance | Return prediction, alternative data | `Q-ml` |

## Layer 4: Data

| Node | What | ID |
|---|---|---|
| Long-run return datasets | JST Macrohistory, DMS Yearbook, Shiller | `D-longrun` |
| Official macro data | FRED, BLS, BEA, Fed H.15, Z.1 | `D-macro` |
| Market data | CRSP, exchange feeds, Kenneth French library | `D-market` |
| Onchain data | DefiLlama, Dune, Glassnode, Artemis | `D-onchain` |
| Filings | SEC EDGAR, CFTC COT, FINRA TRACE | `D-filings` |
| Paid-to-cite data | feed402 envelopes over x402 | `D-feed402` |

## Layer 5: Education

| Node | What | ID |
|---|---|---|
| Personal finance basics | Budget, emergency fund, index funds, tax wrappers | `E-personal` |
| Accounting | Three statements, double entry | `E-accounting` |
| Corporate finance and valuation | DCF, comps, capital structure | `E-corpfin` |
| Canonical texts | Graham, Bogle, Malkiel, Shiller, Taleb, Graeber | `E-texts` |
| Video and courses | Shiller Yale ECON 252, MIT 15.401 | `E-video` |

## Layer 6: Systems

| Node | What | ID |
|---|---|---|
| Monetary policy transmission | Policy rate to mortgages, credit, asset prices | `S-policy` |
| Fiscal and sovereign debt | Deficits, term premium, Treasury supply | `S-fiscal` |
| Financial crises | Kindleberger-Minsky cycle, bank runs | `S-crisis` |
| Dollar system and geopolitics | Reserve currency, sanctions, stablecoins as dollar export | `S-dollar` |
| Tokenization | RWAs, tokenized Treasuries, onchain settlement | `S-token` |
| AI capex cycle | Hyperscaler spend, GPU collateral, power | `S-aicapex` |

## Read Order

1. `01-money-history/TIMELINE.md`
2. `01-money-history/LONG-RUN-RETURNS.md`
3. `02-assets/README.md`, then one card per asset
4. `02-assets/2026-STATE.md`
