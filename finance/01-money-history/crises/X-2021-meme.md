# X-2021-meme: Meme Stocks

Event card, January 2021. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
Retail traders on Reddit bought GameStop, a stock with short interest above its float. GME hit $483 intraday on 28 January 2021 and was below $100 by 3 February. Several brokers restricted buying on 28 January.

## Causes and Mechanics
Heavy short interest plus call-option buying forced shorts and option dealers to buy. Clearing deposits rose with volatility, so brokers short of collateral restricted trading.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| "high levels of short interest in GME presented the potential for a coordinated 'short squeeze.'" | A | [link](https://www.sec.gov/files/staff-report-equity-options-market-struction-conditions-early-2021.pdf) | <!-- voice-ignore-line -->
| 28 Jan 2021: GME intraday high $483.00; then down more than 86%, below $100 by 3 Feb | A | [link](https://www.sec.gov/files/staff-report-equity-options-market-struction-conditions-early-2021.pdf) |
| Moves of +$199.53 (26 to 27 Jan) and -$153.91 (27 to 28 Jan) | A | [link](https://www.sec.gov/files/staff-report-equity-options-market-struction-conditions-early-2021.pdf) |
| 28 Jan 2021: several brokers restrict GME buying over volatility and settlement risk | A | [link](https://www.sec.gov/files/staff-report-equity-options-market-struction-conditions-early-2021.pdf) |

## Lab Data
No GME series in `lab/data`. Shiller CAPE 38.3 in Dec 2021, second only to 1999 to 2000. Fed funds 0.08% to 0.2% through 2021. Grade A, lab.

## Systematic Trader View
Crowded shorts with short interest above float carry squeeze risk that a factor model never shows. Zero rates and free options drove speculation; CAPE at 38 was the market-wide version. Position limits and borrow-cost signals are the defense.

## Primary Sources
- SEC Staff Report on Equity and Options Market Structure Conditions in Early 2021, fetched or computed 2026-11-27.
- Shiller; FRED, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
