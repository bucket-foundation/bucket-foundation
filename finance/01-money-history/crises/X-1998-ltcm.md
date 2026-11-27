# X-1998-ltcm: Russia Default and LTCM

Event card, August to September 1998. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
Russia devalued and defaulted on domestic debt on 17 August 1998. The flight to quality that followed broke Long-Term Capital Management, which lost 44% in August. On 23 September 14 firms put in $3.625 billion for 90% of the fund, a deal brokered by the New York Fed.

## Causes and Mechanics
LTCM ran about $30 of debt per $1 of capital in convergence trades betting that spreads would narrow. After Russia, spreads widened everywhere at once: "in almost every case, they diverged." The rescue was private money; the Fed cut rates that autumn.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| 17 Aug 1998: Russia devalues, restructures domestic debt, 90-day moratorium on private external debt | A | [link](https://www.brookings.edu/articles/an-analysis-of-russias-1998-meltdown-fundamentals-and-market-signals/) |
| 2 Sep 1998: ruble floated; 21 per dollar by 9 Sep against 6.29 on 14 Aug | A | [link](https://www.brookings.edu/articles/an-analysis-of-russias-1998-meltdown-fundamentals-and-market-signals/) |
| End 1997: LTCM at about $30 debt per $1 capital | A | [link](https://www.federalreservehistory.org/essays/ltcm-near-failure) |
| Aug 1998: LTCM loses 44% of its value | A | [link](https://www.federalreservehistory.org/essays/ltcm-near-failure) |
| 23 Sep 1998: 14 firms invest $3.625B for 90% of LTCM; the Fed "did not put its own funds at risk" | A | [link](https://www.federalreservehistory.org/essays/ltcm-near-failure) | <!-- voice-ignore-line -->

## Lab Data
Yahoo SPY daily: 31 Aug 1998 down 7.13%, the 9th worst SPY day since 1993. Grade A, lab.

## Systematic Trader View
Correlations went to one: relative-value trades that look hedged share one risk factor, liquidity. Leverage of 30 to 1 left no room for a spread that widened before it narrowed. Size and leverage limits, plus stress tests that assume every spread widens at once, are the lesson.

## Primary Sources
- [https://www.federalreservehistory.org/essays/ltcm-near-failure](https://www.federalreservehistory.org/essays/ltcm-near-failure), fetched 2026-11-27.
- Brookings, Russia's 1998 meltdown, fetched or computed 2026-11-27.
- Yahoo SPY, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
