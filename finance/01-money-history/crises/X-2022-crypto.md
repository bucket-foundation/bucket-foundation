# X-2022-crypto: Terra and FTX

Event card, May to November 2022. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
TerraUSD, an algorithmic stablecoin, lost its peg in May 2022 and UST and LUNA fell to near zero. FTX, a top crypto exchange, filed for Chapter 11 in Delaware on 11 November 2022 after customers ran on it. Bitcoin fell 77% from its November 2021 peak.

## Causes and Mechanics
UST held its peg through arbitrage with LUNA, so a run minted LUNA without limit and both collapsed. Anchor paid up to 20% to attract deposits. FTX used customer assets at its affiliate Alameda; when FTT and withdrawals fell together, the shortfall showed. Rising rates in 2022 drained the leverage first.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| May 2022: UST loses its peg; UST and LUNA fall to near zero; Anchor yields up to 20% | A | [link](https://www.sec.gov/news/press-release/2023-32) |
| 16 Feb 2023: SEC charges Terraform and Do Kwon | A | [link](https://www.sec.gov/news/press-release/2023-32) |
| 11 Nov 2022: FTX, Alameda, FTX US and over 100 affiliates seek Chapter 11 in Delaware; John J. Ray III named CEO | B | [link](https://www.theblock.co/news/business/2022-11-11-ftx-files-for-chapter-11-bankruptcy-185083) |
| 13 Dec 2022: SEC charges Bankman-Fried; "a house of cards on a foundation of deception" | A | [link](https://www.sec.gov/news/press-release/2022-219) | <!-- voice-ignore-line -->
| UST at $0.409 by 12 May 2022, see [M-stable](../eras/M-stable.md) | A | FRBNY Staff Report 1073 |

## Lab Data
Yahoo BTC-USD: peak $67,567 on 8 Nov 2021, trough $15,787 on 21 Nov 2022, down 76.6%. Terra window: down 52.1% from 4 May to 18 Jun 2022, with 13 Jun down 16.0%. FTX window: down 25.8% from 5 to 21 Nov 2022; 9 Nov down 14.4%. Fed funds 0.20% in Mar 2022 rising to 4.65% by Mar 2023. Grade A, lab.

## Systematic Trader View
Yield paid on a stablecoin above Treasury rates is the warning; it has to come from somewhere. Exchange-token collateral and opaque affiliates are the second. Bitcoin's drawdown began when the Fed turned, months before either failure.

## Primary Sources
- SEC press releases 2023-32 and 2022-219, fetched or computed 2026-11-27.
- The Block, 11 Nov 2022, fetched or computed 2026-11-27.
- Yahoo BTC-USD; FRED FEDFUNDS, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
