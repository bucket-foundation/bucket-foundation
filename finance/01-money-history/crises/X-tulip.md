# X-tulip: Tulip Mania

Event card, 1636 to 1637. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
Dutch tulip bulb contracts rose through the winter of 1636 to 1637 and collapsed in early February 1637. Some single bulbs traded above ten years of a skilled worker's pay.

## Causes and Mechanics
Trade ran in taverns through notarized forward contracts for bulbs still in the ground, with no margin. A 2.5% fee capped at three guilders bought entry. When a Haarlem auction failed, buyers refused delivery; the contracts were unenforceable, so defaults cascaded and the guild converted them into options with a small exit fee.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| "some contracts were changing hands five times" at the peak, winter 1636 to 1637 | B | [link](https://en.wikipedia.org/wiki/Tulip_mania) | <!-- voice-ignore-line -->
| Semper Augustus sold for 10,000 guilders | B | [link](https://en.wikipedia.org/wiki/Tulip_mania) |
| Peak Feb 1637: some bulbs above ten times a skilled artisan's yearly earnings | B | [link](https://en.wikipedia.org/wiki/Tulip_mania) |
| 3 Feb 1637: Haarlem auction fails; crash complete within the week | B | [link](https://en.wikipedia.org/wiki/Tulip_mania) |
| 24 Feb 1637: florists convert post-30 Nov 1636 contracts into option-like deals | B | [link](https://en.wikipedia.org/wiki/Tulip_mania) |
| "The entire business was accomplished on the margins of Dutch economic life, not in the exchange." | B | [link](https://en.wikipedia.org/wiki/Tulip_mania) | <!-- voice-ignore-line -->

## Lab Data
No lab series.

## Systematic Trader View
Unmargined forwards with no clearing let leverage build without a price check. The signal was turnover: one contract resold five times in a season. The damage stayed small because the trade sat outside the banks, a point the quoted page makes too.

## Primary Sources
- Wikipedia, Tulip mania, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
