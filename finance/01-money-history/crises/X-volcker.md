# X-volcker: Volcker Disinflation

Event card, 1979 to 1982. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
Paul Volcker took over the Fed in August 1979 with inflation above 11%. On 6 October 1979 the Fed moved to target reserves, letting rates rise to a record 20%. Two recessions followed and inflation fell to 5% by October 1982.

## Causes and Mechanics
Targeting money quantities let short rates climb until inflation expectations broke. The curve stayed inverted as short rates sat above long ones. Unemployment peaked at 10.8% in late 1982; the bond bull market began.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| 6 Oct 1979: "we think we can get firmer control over the growth in money supply" (Volcker) | A | [link](https://www.federalreservehistory.org/essays/anti-inflation-measures) | <!-- voice-ignore-line -->
| Late 1980: fed funds at a record 20% | A | [link](https://www.federalreservehistory.org/essays/anti-inflation-measures) |
| "We have set our course to restrain growth in money and credit. We mean to stick with it" | A | [link](https://www.federalreservehistory.org/essays/recession-of-1981-82) | <!-- voice-ignore-line -->
| Late 1982: unemployment peaks at 10.8%; inflation 5% by Oct 1982 | A | [link](https://www.federalreservehistory.org/essays/recession-of-1981-82) |

## Lab Data
FRED: fed funds 19.10% in Jun 1981, 10y 13.47%, 3m bill 14.73%, spread -1.26. CPI inflation 14.6% in Mar 1980. Shiller real S&P: peak Nov 1980, trough Jul 1982, down 29.3%; nominal index ended 1982 at its high for the window. CAPE 8.5 in Nov 1980. Grade A, lab.

## Systematic Trader View
A deep curve inversion plus record real rates priced the recession. Valuations at CAPE 8.5 set up the 1982 to 2000 equity run, and 13% Treasury yields set up four decades of falling rates. A value and duration buyer was paid most in the months of peak pain.

## Primary Sources
- [https://www.federalreservehistory.org/essays/anti-inflation-measures](https://www.federalreservehistory.org/essays/anti-inflation-measures), fetched 2026-11-27.
- [https://www.federalreservehistory.org/essays/recession-of-1981-82](https://www.federalreservehistory.org/essays/recession-of-1981-82), fetched 2026-11-27.
- [https://www.federalreservehistory.org/essays/great-inflation](https://www.federalreservehistory.org/essays/great-inflation), fetched 2026-11-27.
- FRED FEDFUNDS, GS10, TB3MS, CPIAUCSL; Shiller, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
