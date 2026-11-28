# X-japan-1990: Japan Bubble and Crash

Event card, 1986 to 1992. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
Japan's discount rate sat at 2.5% from February 1987 to May 1989 while land and stock prices soared. The Nikkei peaked at ¥38,915 in the last session of 1989. Five rate hikes took the discount rate to 6% by August 1990 and the index fell by about half that year.

## Causes and Mechanics
Easing after the Plaza Accord aimed at the yen; cheap money and bank lending against land drove a property and equity spiral. Tightening from May 1989 burst it; land prices fell later and bad loans stayed on bank books for a decade.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| Official discount rate 2.5% from 23 Feb 1987, the lowest in history to that date | A | [link](https://www.mof.go.jp/english/pri/publication/policy_1972-1990/Chapter3-2.pdf) |
| Hikes: 3.25% (31 May 1989), 3.75% (11 Oct), 4.25% (25 Dec), 5.25% (20 Mar 1990), 6.00% (30 Aug 1990) | A | [link](https://www.mof.go.jp/english/pri/publication/policy_1972-1990/Chapter3-2.pdf) |
| "the peak of stock prices in the final session of 1989 at ¥38,915" | A | [link](https://www.mof.go.jp/english/pri/publication/policy_1972-1990/Chapter3-2.pdf) | <!-- voice-ignore-line -->
| Land prices "did not fall for a while even when the Nikkei Stock Average started to decline" | A | [link](https://www.mof.go.jp/english/pri/publication/policy_1972-1990/Chapter3-2.pdf) | <!-- voice-ignore-line -->
| Nikkei record stood until Feb 2024 | C | search snippet, nippon.com |

## Lab Data
No Nikkei series in `lab/data`. JST records Japan's systemic crisis starting 1997, eight years after the equity peak. Grade A, lab.

## Systematic Trader View
Rate hikes into a credit-fuelled asset boom ended it within months; the first hike (May 1989) came seven months before the top. Land lagged stocks, which gave property holders time to exit. A trend rule out of the Nikkei in early 1990 avoided a 34-year round trip.

## Primary Sources
- Ministry of Finance Japan, Policy History 1972-1990, ch. 3-2 (text extracted locally), fetched or computed 2026-11-27.
- JST R6, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
