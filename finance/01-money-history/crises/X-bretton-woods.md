# X-bretton-woods: Bretton Woods

Event card, 1944 to 1971. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
44 nations met at Bretton Woods in July 1944 and pegged their currencies to the dollar, which the US pegged to gold at $35 an ounce. The IMF opened in December 1945; full convertibility came in 1958.

## Causes and Mechanics
Currencies held within 1% of their dollar parity; the US kept gold at $35. The system needed US dollar supply to grow for world trade, yet more dollars abroad eroded the gold cover (Triffin). It ended in 1971.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| Jul 1944: 44 nations meet at the Mount Washington Hotel, New Hampshire | A | [link](https://www.federalreservehistory.org/essays/bretton-woods-created) |
| Dec 1945: IMF starts with 29 members; dollar at $35 an ounce | A | [link](https://www.federalreservehistory.org/essays/bretton-woods-created) |
| "The United States had the responsibility of keeping the price of gold fixed." | A | [link](https://www.federalreservehistory.org/essays/bretton-woods-created) | <!-- voice-ignore-line -->
| 1958: currencies convertible, system fully working | A | [link](https://www.federalreservehistory.org/essays/bretton-woods-created) |
| "The system of currency convertibility that emerged from Bretton Woods lasted until 1971." | A | [link](https://www.federalreservehistory.org/essays/bretton-woods-created) | <!-- voice-ignore-line -->

## Lab Data
Shiller real S&P and TB3MS cover the era. See [M-bw](../eras/M-bw.md) for the IMF Articles.

## Systematic Trader View
A fixed peg moves the risk into reserves. A trader watched foreign dollar claims against US gold; once claims exceeded gold, the break was a matter of when. JST records no systemic banking crisis in its 18 countries from 1946 to 1972.

## Primary Sources
- [https://www.federalreservehistory.org/essays/bretton-woods-created](https://www.federalreservehistory.org/essays/bretton-woods-created), fetched 2026-11-27.
- JST R6, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
