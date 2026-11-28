# X-2015-china: China Stock Crash and Yuan Devaluation

Event card, 2015 to 2016. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
A margin-fuelled Chinese equity rally reversed in June 2015; by 13 July Shanghai was 25% off its peak and investors had lost about $3.5 trillion. On 11 August 2015 the PBOC cut the yuan central parity by nearly 2%, and global markets sold off into early 2016.

## Causes and Mechanics
Retail margin lending drove the rally; forced selling drove the fall, and the state stepped in with purchases and trading halts. The yuan move signalled that a long one-way appreciation was over, which pushed capital out of emerging markets.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| 13 Jul 2015: Shanghai down about 25% and Shenzhen 35% from peak; "investors lost about $3.5 trillion" | A | [link](https://www.uscc.gov/sites/default/files/Research/China%E2%80%99s%20Stock%20Market%20Collapse%20and%20Government%E2%80%99s%20Response.pdf) | <!-- voice-ignore-line -->
| Even after the fall the exchanges were up 74% and 84% year on year | A | [link](https://www.uscc.gov/sites/default/files/Research/China%E2%80%99s%20Stock%20Market%20Collapse%20and%20Government%E2%80%99s%20Response.pdf) |
| 11 Aug 2015: central parity 6.2298 per dollar against 6.1162 the day before, a "one-off" adjustment | B | [link](https://en.people.cn/n/2015/0811/c90000-8934466.html) | <!-- voice-ignore-line -->
| Shanghai peak about 5,166 on 12 Jun 2015 | C | search snippets |

## Lab Data
Yahoo: EEM 28 Apr 2015 to 20 Jan 2016, down 34.4%; SPY 20 Jul 2015 to 11 Feb 2016, down 13.0%. BTC 18 Aug 2015 down 18.2%. Grade A, lab.

## Systematic Trader View
A margin-driven market doubles and halves fast. The yuan move was the global transmission. Emerging-market equities had already been falling for three months, the leading signal.

## Primary Sources
- USCC staff report, 13 Jul 2015, fetched or computed 2026-11-27.
- People's Daily, 11 Aug 2015, fetched or computed 2026-11-27.
- Yahoo EEM, SPY, BTC-USD, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
